from __future__ import annotations

import mimetypes
from pathlib import Path

from fastapi import HTTPException
from fastapi.responses import FileResponse


def resolve_artifact_media_type(mime_type: str | None, file_name: str | None) -> str:
    if mime_type and mime_type != "application/octet-stream":
        return mime_type

    if file_name:
        guessed_type, _ = mimetypes.guess_type(file_name)
        if guessed_type:
            return guessed_type

    return mime_type or "application/octet-stream"


def load_visible_artifact(conn, artifact_id: int, viewer: str | None):
    from server.main import ensure_permission, ensure_visible_scoped_item, load_viewer_context

    viewer_context = load_viewer_context(conn, viewer)
    ensure_permission(
        conn,
        viewer_context,
        "view_portfolio",
        title="Artifact access denied",
        summary="The selected viewer attempted to open an intake artifact without access.",
        deep_link="/intake",
    )
    artifact = conn.execute(
        """
        SELECT id, deal_id, intake_source_path, file_name, mime_type
        FROM incoming_documents
        WHERE id = %s
        """,
        (artifact_id,),
    ).fetchone()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    ensure_visible_scoped_item(
        conn,
        viewer_context,
        deal_id=int(artifact["deal_id"]) if artifact["deal_id"] else None,
        deep_link="/intake",
        title="Artifact access denied",
        summary="The selected viewer attempted to open an artifact outside their visible scope.",
    )
    return artifact


def build_artifact_file_response(artifact):
    path = Path(artifact["intake_source_path"])
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Artifact content is not available")

    media_type = resolve_artifact_media_type(artifact["mime_type"], artifact["file_name"])
    return FileResponse(
        path,
        media_type=media_type,
        filename=artifact["file_name"],
        content_disposition_type="inline",
    )
