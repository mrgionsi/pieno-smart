import httpx

from app.core.config import Settings
from app.ingestion.client import MimitDatasetClient, PRICE_LINK_TEXT, STATION_LINK_TEXT


def test_dataset_client_downloads_current_snapshot_from_dataset_page() -> None:
    dataset_page = f"""
    <html>
      <body>
        <a href="/files/prezzi.csv">{PRICE_LINK_TEXT}</a>
        <a href="/files/anagrafica.csv">{STATION_LINK_TEXT}</a>
      </body>
    </html>
    """

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/dataset":
            return httpx.Response(200, text=dataset_page)
        if request.url.path == "/files/prezzi.csv":
            return httpx.Response(200, text="2026-04-28\n123|Benzina|1.799|1|28/04/2026 07:30:00\n")
        if request.url.path == "/files/anagrafica.csv":
            return httpx.Response(200, text="2026-04-28\n123|Gestore|Q8|Stradale|Nome|Via Roma|Roma|RM|41.9|12.5\n")
        return httpx.Response(404)

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport, base_url="https://example.test") as http_client:
        client = MimitDatasetClient(
            settings=Settings(
                mimit_dataset_page_url="https://example.test/dataset",
                mimit_http_timeout_seconds=5.0,
            ),
            http_client=http_client,
        )

        payload = client.download_current_snapshot()

    assert payload.dataset_page_url == "https://example.test/dataset"
    assert payload.prices_url == "https://example.test/files/prezzi.csv"
    assert payload.stations_url == "https://example.test/files/anagrafica.csv"
    assert "Benzina" in payload.prices_content
    assert "Gestore" in payload.stations_content


def test_dataset_client_retries_transient_protocol_error() -> None:
    dataset_page = f"""
    <html>
      <body>
        <a href="/files/prezzi.csv">{PRICE_LINK_TEXT}</a>
        <a href="/files/anagrafica.csv">{STATION_LINK_TEXT}</a>
      </body>
    </html>
    """
    attempts = {"prices": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/dataset":
            return httpx.Response(200, text=dataset_page)
        if request.url.path == "/files/anagrafica.csv":
            return httpx.Response(200, text="2026-04-28\n123|Gestore|Q8|Stradale|Nome|link|Via Roma|Roma|RM|41.9|12.5\n")
        if request.url.path == "/files/prezzi.csv":
            attempts["prices"] += 1
            if attempts["prices"] == 1:
                raise httpx.RemoteProtocolError("Server disconnected")
            return httpx.Response(200, text="2026-04-28\n123|Benzina|1.799|1|28/04/2026 07:30:00\n")
        return httpx.Response(404)

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport, base_url="https://example.test") as http_client:
        client = MimitDatasetClient(
            settings=Settings(
                mimit_dataset_page_url="https://example.test/dataset",
                mimit_http_timeout_seconds=5.0,
                mimit_http_max_retries=2,
            ),
            http_client=http_client,
        )

        payload = client.download_current_snapshot()

    assert attempts["prices"] == 2
    assert "Benzina" in payload.prices_content
