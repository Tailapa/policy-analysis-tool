from app.services.source_resolver import resolve_sources


def test_resolve_single_known_source():
    result = resolve_sources("PIB")
    assert result == [{"label": "PIB", "url": "https://pib.gov.in"}]


def test_resolve_splits_multi_source_citation():
    result = resolve_sources("IFSCA, PIB")
    assert result == [
        {"label": "IFSCA", "url": "https://ifsca.gov.in"},
        {"label": "PIB", "url": "https://pib.gov.in"},
    ]


def test_resolve_unknown_source_has_no_url():
    result = resolve_sources("Some Obscure Newsletter")
    assert result == [{"label": "Some Obscure Newsletter", "url": None}]
