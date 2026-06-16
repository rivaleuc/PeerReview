import contract_mod as C


def _scores(n, m, c, r):
    return {"novelty": n, "methodology": m, "clarity": c, "reproducibility": r}


def test_composite_score_known_values():
    assert C.composite_score(_scores(0, 0, 0, 0)) == 0
    assert C.composite_score(_scores(10, 10, 10, 10)) == 100
    assert C.composite_score(_scores(5, 5, 5, 5)) == 50
    assert C.composite_score(_scores(7, 8, 9, 10)) == 85  # sum 34 -> 85


def test_normalize_derives_composite_and_clamps():
    out = C.normalize_review_verdict({"scores": _scores(20, -3, 5, 8), "reasoning": "x"})
    assert out["scores"] == _scores(10, 0, 5, 8)
    assert out["composite"] == C.composite_score(out["scores"])


def test_validator_accepts_consistent():
    s = _scores(6, 7, 8, 9)
    v = {"scores": s, "composite": C.composite_score(s), "reasoning": "ok"}
    assert C.validate_review_verdict(v) is True


def test_validator_rejects_out_of_range_dim():
    s = _scores(11, 5, 5, 5)
    v = {"scores": s, "composite": C.composite_score(s), "reasoning": "x"}
    assert C.validate_review_verdict(v) is False
    s2 = _scores(-1, 5, 5, 5)
    v2 = {"scores": s2, "composite": 0, "reasoning": "x"}
    assert C.validate_review_verdict(v2) is False


def test_validator_rejects_wrong_composite():
    s = _scores(5, 5, 5, 5)
    assert C.validate_review_verdict({"scores": s, "composite": 99, "reasoning": "x"}) is False


def test_validator_rejects_missing_dims_and_bad_types():
    assert C.validate_review_verdict({"scores": {"novelty": 5}, "composite": 0, "reasoning": "x"}) is False
    s = _scores(5, 5, 5, 5)
    assert C.validate_review_verdict({"scores": s, "composite": "50", "reasoning": "x"}) is False
    assert C.validate_review_verdict({"scores": {"novelty": True, "methodology": 5, "clarity": 5, "reproducibility": 5}, "composite": 0, "reasoning": "x"}) is False
    assert C.validate_review_verdict({"scores": s, "composite": C.composite_score(s), "reasoning": ""}) is False
    assert C.validate_review_verdict({"scores": "nope", "composite": 0, "reasoning": "x"}) is False


def test_normalized_output_always_passes_validator():
    samples = [(-5, 0, 5, 10), (3, 3, 3, 3), (10, 10, 10, 10), (1, 2, 3, 4), (9, 0, 7, 2), (15, 15, 15, 15)]
    for tup in samples:
        v = C.normalize_review_verdict({"scores": _scores(*tup)})
        assert C.validate_review_verdict(v) is True
