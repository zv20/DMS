# Version 1 database fixture

`v1-cdaa8a2.db` was created with the real `DatabaseService` and model sources
from DMS commit `cdaa8a2ce809788c4390a1378942360b3060f838`, using .NET 10 and
Microsoft.Data.Sqlite 10.0.14. The historical service created the schema and
saved the synthetic ingredient, recipe, and planner slot through its normal
APIs; its backup API produced the checked-in file. It contains no user data.
The fixture has `PRAGMA user_version = 1` and no template image tables.

SHA-256: `0ab064ef47fe1aca93322d47b08f525c3d7058b073a7518d08f602541f4886b7`

It represents this specific historical state, not every older database shape.
