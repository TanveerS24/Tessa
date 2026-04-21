import os
from typing import Optional
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.collection import Collection
from pymongo.database import Database
from datetime import datetime


class DatabaseManager:
    _instance: Optional['DatabaseManager'] = None
    _client: Optional[MongoClient] = None
    _db: Optional[Database] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def connect(self) -> bool:
        mongo_uri = os.getenv("MONGODB_URI", "mongodb://mongodb:27017/tessa")
        try:
            self._client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            self._db = self._client.get_database()
            # Create indexes for efficient queries
            self._ensure_indexes()
            # Verify connection
            self._client.admin.command('ping')
            return True
        except Exception as e:
            print(f"MongoDB connection failed: {e}")
            return False

    def _ensure_indexes(self):
        if self._db is None:
            return
        # Index for convo collection - timestamp for recent queries
        self._db.convo.create_index([("timestamp", DESCENDING)])
        # Index for context collection - key for unique lookups
        self._db.context.create_index([("key", ASCENDING)], unique=True)

    @property
    def db(self) -> Optional[Database]:
        return self._db

    @property
    def conversations(self) -> Optional[Collection]:
        return self._db.convo if self._db else None

    @property
    def context(self) -> Optional[Collection]:
        return self._db.context if self._db else None

    def health_check(self) -> bool:
        try:
            if self._client:
                self._client.admin.command('ping')
                return True
            return False
        except Exception:
            return False


db_manager = DatabaseManager()


def get_db() -> DatabaseManager:
    return db_manager
