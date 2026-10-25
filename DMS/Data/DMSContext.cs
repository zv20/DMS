using Microsoft.EntityFrameworkCore;

namespace DMS.Data;

public class Item
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class DMSContext : DbContext
{
    public DMSContext(DbContextOptions<Item> options)
        : base(options)
    {
    }

    public DbSet<Item> Items { get; set; }
}