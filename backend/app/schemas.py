from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class PartURLOut(BaseModel):
    id: int
    url: str

    model_config = {"from_attributes": True}


class PartCreate(BaseModel):
    title: str
    short_description: str
    type: str
    custom_image_path: Optional[str] = None
    urls: List[str] = []


class PartUpdate(BaseModel):
    title: Optional[str] = None
    short_description: Optional[str] = None
    type: Optional[str] = None
    custom_image_path: Optional[str] = None
    urls: Optional[List[str]] = None


class PartOut(BaseModel):
    id: int
    title: str
    short_description: str
    type: str
    custom_image_path: Optional[str]
    created_at: datetime
    updated_at: datetime
    urls: List[PartURLOut]

    model_config = {"from_attributes": True}
