from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import certifi

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    db_instance.client = AsyncIOMotorClient(
        settings.MONGO_URI,
        tlsCAFile=certifi.where()
    )
    db_instance.db = db_instance.client[settings.DATABASE_NAME]
    print(f"Connected to MongoDB Atlas: {settings.DATABASE_NAME}")

async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        print("Closed MongoDB connection.")

def get_db():
    return db_instance.db