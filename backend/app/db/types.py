from __future__ import annotations

from sqlalchemy.types import UserDefinedType


class GeographyPoint(UserDefinedType):
    def get_col_spec(self, **_: object) -> str:
        return "geography(Point, 4326)"
