using System.Globalization;
using System.Text;

namespace DMS.Services;

/// <summary>Builds an A4 PDF from one JPEG per page.</summary>
public static class ImagePdf
{
    public static byte[] Create(IReadOnlyList<byte[]> images, int pixelWidth, int pixelHeight)
    {
        if (images.Count == 0 || pixelWidth <= 0 || pixelHeight <= 0) throw new ArgumentException("A PDF needs at least one valid page.");
        const double pageWidth = 595.28, pageHeight = 841.89;
        var scale = Math.Min(pageWidth / pixelWidth, pageHeight / pixelHeight);
        var width = pixelWidth * scale; var height = pixelHeight * scale;
        var x = (pageWidth - width) / 2; var y = (pageHeight - height) / 2;
        var content = FormattableString.Invariant($"q\n{width:0.###} 0 0 {height:0.###} {x:0.###} {y:0.###} cm\n/Im0 Do\nQ\n");
        using var stream = new MemoryStream();
        var offsets = new List<long>();
        void Write(string value) { var bytes = Encoding.ASCII.GetBytes(value); stream.Write(bytes, 0, bytes.Length); }
        void Object(int number, string body) { offsets.Add(stream.Position); Write($"{number} 0 obj\n{body}\nendobj\n"); }
        Write("%PDF-1.4\n%âãÏÓ\n");
        Object(1, "<< /Type /Catalog /Pages 2 0 R >>");
        var kids = string.Join(" ", Enumerable.Range(0, images.Count).Select(i => $"{3 + i * 3} 0 R"));
        Object(2, $"<< /Type /Pages /Kids [{kids}] /Count {images.Count} >>");
        for (var i = 0; i < images.Count; i++)
        {
            var page = 3 + i * 3; var image = images[i];
            Object(page, $"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {pageWidth.ToString("0.##", CultureInfo.InvariantCulture)} {pageHeight.ToString("0.##", CultureInfo.InvariantCulture)}] /Resources << /XObject << /Im0 {page + 2} 0 R >> >> /Contents {page + 1} 0 R >>");
            Object(page + 1, $"<< /Length {Encoding.ASCII.GetByteCount(content)} >>\nstream\n{content}endstream");
            offsets.Add(stream.Position);
            Write($"{page + 2} 0 obj\n<< /Type /XObject /Subtype /Image /Width {pixelWidth} /Height {pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {image.Length} >>\nstream\n");
            stream.Write(image, 0, image.Length);
            Write("\nendstream\nendobj\n");
        }
        var xrefOffset = stream.Position;
        var size = 3 + images.Count * 3;
        Write($"xref\n0 {size}\n0000000000 65535 f \n");
        foreach (var offset in offsets) Write($"{offset.ToString("D10", CultureInfo.InvariantCulture)} 00000 n \n");
        Write($"trailer\n<< /Size {size} /Root 1 0 R >>\nstartxref\n{xrefOffset}\n%%EOF\n");
        return stream.ToArray();
    }
}
