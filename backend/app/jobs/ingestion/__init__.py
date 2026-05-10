"""Autonomous ingestion job package."""

from app.jobs.ingestion.cli import build_parser, main

__all__ = ["build_parser", "main"]
