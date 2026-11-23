using System.Reflection;
using System.Text.Json;
using DMS.Models;
using Microsoft.Data.Sqlite;

namespace DMS.Services;

public partial class DatabaseService
{
    private static readonly PropertyInfo[] DocumentFields = Fields<TemplateDocument>(nameof(TemplateDocument.HeaderText), nameof(TemplateDocument.ShowHeaderReflection), nameof(TemplateDocument.FooterText), nameof(TemplateDocument.FooterNoticeText), nameof(TemplateDocument.FontSize), nameof(TemplateDocument.MinimumFontSize), nameof(TemplateDocument.MaximumFontSize), nameof(TemplateDocument.AllowFontShrink), nameof(TemplateDocument.DayHeadingFormat), nameof(TemplateDocument.DateRangeFormat), nameof(TemplateDocument.HideEmptyDays), nameof(TemplateDocument.FontFamily), nameof(TemplateDocument.HeaderColor), nameof(TemplateDocument.BodyColor), nameof(TemplateDocument.AllergenAccentColor), nameof(TemplateDocument.AllergenAccentOpacity), nameof(TemplateDocument.FooterColor), nameof(TemplateDocument.BackgroundColor), nameof(TemplateDocument.BackgroundOpacity), nameof(TemplateDocument.BackgroundImageDataUri), nameof(TemplateDocument.BackgroundImageAssetId), nameof(TemplateDocument.BackgroundImageOpacity), nameof(TemplateDocument.DaySpacing), nameof(TemplateDocument.MealLineSpacing));
    private static readonly PropertyInfo[] StyleFields = Fields<TemplateTextStyle>(nameof(TemplateTextStyle.FontFamily), nameof(TemplateTextStyle.FontSize), nameof(TemplateTextStyle.Color), nameof(TemplateTextStyle.Opacity), nameof(TemplateTextStyle.Bold), nameof(TemplateTextStyle.Italic), nameof(TemplateTextStyle.Underline), nameof(TemplateTextStyle.Alignment));
    private static readonly PropertyInfo[] AppearanceFields = Fields<TemplateBlockAppearance>(nameof(TemplateBlockAppearance.BackgroundColor), nameof(TemplateBlockAppearance.BorderColor), nameof(TemplateBlockAppearance.BorderOpacity), nameof(TemplateBlockAppearance.BorderThickness), nameof(TemplateBlockAppearance.CornerRadius), nameof(TemplateBlockAppearance.Padding), nameof(TemplateBlockAppearance.Opacity));
    private static readonly PropertyInfo[] ImageFields = Fields<TemplateImage>(nameof(TemplateImage.Id), nameof(TemplateImage.AssetId), nameof(TemplateImage.DataUri), nameof(TemplateImage.X), nameof(TemplateImage.Y), nameof(TemplateImage.Width), nameof(TemplateImage.Height), nameof(TemplateImage.Opacity), nameof(TemplateImage.InFrontOfText), nameof(TemplateImage.LockAspectRatio), nameof(TemplateImage.FillFrame), nameof(TemplateImage.IsCanvasBackground), nameof(TemplateImage.ReserveTextSpace), nameof(TemplateImage.AltText));

    private static PropertyInfo[] Fields<T>(params string[] names) => names.Select(name => typeof(T).GetProperty(name)!).ToArray();

    private static string FieldDefinitions(PropertyInfo[] fields) => string.Join(",", fields.Select(p => $"\"{p.Name}\" {(p.PropertyType == typeof(string) ? "TEXT" : p.PropertyType == typeof(bool) ? "INTEGER" : "REAL")}"));
    private static string FieldNames(PropertyInfo[] fields) => string.Join(",", fields.Select(p => $"\"{p.Name}\""));

    private void InitializeTemplateStorage()
    {
        using var transaction = _connection!.BeginTransaction();
        using var command = _connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = "SELECT COUNT(*) FROM schema_migrations WHERE version=6";
        if (Convert.ToInt32(command.ExecuteScalar()) != 0) { transaction.Commit(); return; }
        if (!HasColumn("templates", "data_json"))
        {
            command.CommandText = "SELECT COUNT(*) FROM sqlite_schema WHERE type='table' AND name IN ('template_documents','template_day_layouts','template_text_styles','template_block_appearances','template_image_placements','meal_categories','recent_template_colors')";
            if (Convert.ToInt32(command.ExecuteScalar()) != 7) throw new InvalidDataException("The normalized database schema is incomplete.");
            command.CommandText = "INSERT OR IGNORE INTO schema_migrations(version) VALUES (2),(3),(6); PRAGMA user_version=6";
            command.ExecuteNonQuery();
            transaction.Commit();
            return;
        }
        command.CommandText = $@"CREATE TABLE template_documents (template_name TEXT PRIMARY KEY REFERENCES templates(name) ON UPDATE CASCADE ON DELETE CASCADE, {FieldDefinitions(DocumentFields)});
CREATE TABLE template_day_layouts (template_name TEXT NOT NULL REFERENCES templates(name) ON UPDATE CASCADE ON DELETE CASCADE, position INTEGER NOT NULL, height REAL, PRIMARY KEY(template_name,position));
CREATE TABLE template_text_styles (template_name TEXT NOT NULL REFERENCES templates(name) ON UPDATE CASCADE ON DELETE CASCADE, key TEXT NOT NULL, {FieldDefinitions(StyleFields)}, PRIMARY KEY(template_name,key));
CREATE TABLE template_block_appearances (template_name TEXT NOT NULL REFERENCES templates(name) ON UPDATE CASCADE ON DELETE CASCADE, key TEXT NOT NULL, {FieldDefinitions(AppearanceFields)}, PRIMARY KEY(template_name,key));
CREATE TABLE template_image_placements (template_name TEXT NOT NULL REFERENCES templates(name) ON UPDATE CASCADE ON DELETE CASCADE, position INTEGER NOT NULL, {FieldDefinitions(ImageFields)}, PRIMARY KEY(template_name,position));
CREATE TABLE meal_categories (position INTEGER PRIMARY KEY, id TEXT NOT NULL COLLATE NOCASE UNIQUE, name TEXT NOT NULL);
CREATE TABLE recent_template_colors (position INTEGER PRIMARY KEY, color TEXT NOT NULL);";
        command.ExecuteNonQuery();
        foreach (var (name, json) in ReadTemplateRows(transaction).ToList())
        {
            var template = JsonSerializer.Deserialize<MenuTemplate>(json) ?? throw new InvalidDataException("Unreadable template.");
            if (template.Document == null) throw new InvalidDataException("Template document is missing.");
            template.Name = name;
            var references = ExtractTemplateImages(template, transaction, preserveBrokenReferences: true);
            WriteTemplateDocument(template, transaction);
            ReplaceTemplateImageReferences(name, references, transaction);
        }
        command.CommandText = "SELECT key,value FROM settings WHERE key IN ('meal_categories','recent_template_colors')";
        var values = new Dictionary<string,string>();
        using (var reader = command.ExecuteReader()) while (reader.Read()) values.Add(reader.GetString(0), reader.GetString(1));
        var categories = values.TryGetValue("meal_categories", out var categoryJson) ? ParseMealCategories(categoryJson) : MealCategory.Defaults();
        var colors = values.TryGetValue("recent_template_colors", out var colorJson) ? JsonSerializer.Deserialize<List<string>>(colorJson) ?? [] : [];
        WriteSettingsLists(categories, colors, transaction);
        command.CommandText = "DELETE FROM settings WHERE key IN ('meal_categories','recent_template_colors'); ALTER TABLE templates DROP COLUMN data_json; INSERT INTO schema_migrations(version) VALUES (6); PRAGMA user_version=6;";
        command.ExecuteNonQuery();
        transaction.Commit();
    }

    private void InsertFields(string table, string name, string keyColumn, object key, object value, PropertyInfo[] fields, SqliteTransaction transaction)
    {
        using var command = _connection!.CreateCommand(); command.Transaction = transaction;
        var columns = keyColumn.Length == 0 ? "template_name" : $"template_name,{keyColumn}";
        var keys = keyColumn.Length == 0 ? "@name" : "@name,@key";
        command.CommandText = $"INSERT INTO {table}({columns},{FieldNames(fields)}) VALUES({keys},{string.Join(",", fields.Select((_,i) => "@p"+i))})";
        command.Parameters.AddWithValue("@name", name);
        if (keyColumn.Length != 0) command.Parameters.AddWithValue("@key", key);
        for (var i = 0; i < fields.Length; i++) command.Parameters.AddWithValue("@p"+i, fields[i].GetValue(value) ?? DBNull.Value);
        command.ExecuteNonQuery();
    }

    private static void ReadFields(SqliteDataReader reader, object target, PropertyInfo[] fields, int offset)
    {
        for (var i = 0; i < fields.Length; i++)
        {
            if (reader.IsDBNull(offset+i)) { if (fields[i].PropertyType == typeof(string) && new NullabilityInfoContext().Create(fields[i]).WriteState == NullabilityState.Nullable) fields[i].SetValue(target, null); else throw new InvalidDataException("Missing template value."); continue; }
            object value = fields[i].PropertyType == typeof(string) ? reader.GetString(offset+i) : fields[i].PropertyType == typeof(bool) ? reader.GetInt64(offset+i) switch { 0 => false, 1 => true, _ => throw new InvalidDataException("Invalid template boolean.") } : reader.GetDouble(offset+i);
            if (value is double number && !double.IsFinite(number)) throw new InvalidDataException("Invalid template number.");
            fields[i].SetValue(target, value);
        }
    }

    private void WriteTemplateDocument(MenuTemplate template, SqliteTransaction transaction)
    {
        var doc = template.Document ?? throw new InvalidDataException("Template document is missing.");
        using var delete = _connection!.CreateCommand(); delete.Transaction = transaction;
        delete.CommandText = "DELETE FROM template_documents WHERE template_name=@name; DELETE FROM template_day_layouts WHERE template_name=@name; DELETE FROM template_text_styles WHERE template_name=@name; DELETE FROM template_block_appearances WHERE template_name=@name; DELETE FROM template_image_placements WHERE template_name=@name";
        delete.Parameters.AddWithValue("@name", template.Name); delete.ExecuteNonQuery();
        InsertFields("template_documents", template.Name, "", 0, doc, DocumentFields, transaction);
        for (var i=0; i<doc.DayHeights.Length; i++) { using var c = _connection.CreateCommand(); c.Transaction=transaction; c.CommandText="INSERT INTO template_day_layouts VALUES(@name,@position,@height)"; c.Parameters.AddWithValue("@name",template.Name); c.Parameters.AddWithValue("@position",i); c.Parameters.AddWithValue("@height", (object?)doc.DayHeights[i] ?? DBNull.Value); c.ExecuteNonQuery(); }
        foreach (var (key, style) in doc.TextStyles) InsertFields("template_text_styles",template.Name,"key",key,style,StyleFields,transaction);
        foreach (var (key, appearance) in doc.BlockAppearances) InsertFields("template_block_appearances",template.Name,"key",key,appearance,AppearanceFields,transaction);
        for (var i=0;i<doc.DecorativeImages.Count;i++) InsertFields("template_image_placements",template.Name,"position",i,doc.DecorativeImages[i],ImageFields,transaction);
    }

    private MenuTemplate ReadStoredTemplate(string name, bool preset, SqliteTransaction? transaction = null)
        => ReadStoredTemplate(_connection!, name, preset, transaction);

    private static MenuTemplate ReadStoredTemplate(SqliteConnection source, string name, bool preset, SqliteTransaction? transaction = null)
    {
        var result = new MenuTemplate { Name=name, IsPreset=preset, Document=new TemplateDocument() }; var doc=result.Document;
        using var command=source.CreateCommand(); command.Transaction=transaction;
        command.CommandText=$"SELECT {FieldNames(DocumentFields)} FROM template_documents WHERE template_name=@name"; command.Parameters.AddWithValue("@name",name);
        using (var reader=command.ExecuteReader()) { if (!reader.Read()) throw new InvalidDataException("Template document is missing."); ReadFields(reader,doc,DocumentFields,0); }
        command.CommandText="SELECT position,height FROM template_day_layouts WHERE template_name=@name ORDER BY position";
        var heights=new List<double?>(); using (var reader=command.ExecuteReader()) while(reader.Read()) { if(reader.GetInt32(0)!=heights.Count) throw new InvalidDataException("Invalid day layout order."); heights.Add(reader.IsDBNull(1)?null:reader.GetDouble(1)); } doc.DayHeights=heights.ToArray();
        command.CommandText=$"SELECT key,{FieldNames(StyleFields)} FROM template_text_styles WHERE template_name=@name";
        using (var reader=command.ExecuteReader()) while(reader.Read()) { var value=new TemplateTextStyle(); ReadFields(reader,value,StyleFields,1); doc.TextStyles.Add(reader.GetString(0),value); }
        command.CommandText=$"SELECT key,{FieldNames(AppearanceFields)} FROM template_block_appearances WHERE template_name=@name";
        using (var reader=command.ExecuteReader()) while(reader.Read()) { var value=new TemplateBlockAppearance(); ReadFields(reader,value,AppearanceFields,1); doc.BlockAppearances.Add(reader.GetString(0),value); }
        command.CommandText=$"SELECT position,{FieldNames(ImageFields)} FROM template_image_placements WHERE template_name=@name ORDER BY position";
        using (var reader=command.ExecuteReader()) while(reader.Read()) { if(reader.GetInt32(0)!=doc.DecorativeImages.Count) throw new InvalidDataException("Invalid image order."); var value=new TemplateImage(); ReadFields(reader,value,ImageFields,1); doc.DecorativeImages.Add(value); }
        return result;
    }

    private void WriteSettingsLists(IReadOnlyList<MealCategory> categories, IReadOnlyList<string> colors, SqliteTransaction transaction)
    {
        using var command=_connection!.CreateCommand(); command.Transaction=transaction; command.CommandText="DELETE FROM meal_categories; DELETE FROM recent_template_colors"; command.ExecuteNonQuery();
        for(var i=0;i<categories.Count;i++) { command.Parameters.Clear(); command.CommandText="INSERT INTO meal_categories VALUES(@p,@id,@name)"; command.Parameters.AddWithValue("@p",i); command.Parameters.AddWithValue("@id",categories[i].Id); command.Parameters.AddWithValue("@name",categories[i].Name); command.ExecuteNonQuery(); }
        for(var i=0;i<colors.Count;i++) { command.Parameters.Clear(); command.CommandText="INSERT INTO recent_template_colors VALUES(@p,@color)"; command.Parameters.AddWithValue("@p",i); command.Parameters.AddWithValue("@color",colors[i]); command.ExecuteNonQuery(); }
    }
}
