from datetime import datetime
from typing import List, Optional
from sqlmodel import Field, Relationship, SQLModel


class PartURL(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    part_id: int = Field(foreign_key="part.id")
    url: str
    part: Optional["Part"] = Relationship(back_populates="urls")


class Part(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    short_description: Optional[str] = None
    type: str
    custom_image_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    urls: List[PartURL] = Relationship(back_populates="part")


class ShoppingItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    part_id: int = Field(foreign_key="part.id", unique=True, index=True)
    qty: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
