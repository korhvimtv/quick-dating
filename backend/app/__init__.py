"""
Quick Datings backend package.

This package follows a simple clean architecture style separation:
- core: configuration and security utilities
- db: database session and base model
- models: SQLAlchemy models (persistence layer)
- schemas: Pydantic models (API layer)
- repositories: database access helpers
- services: business logic / use cases
- api: FastAPI routers and dependencies
"""

