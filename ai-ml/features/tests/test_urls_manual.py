import pandas as pd
from feature_engineer import FeatureEngineer

df = pd.DataFrame({
    "url": [
        "https://www.google.com/search?q=test",
        "http://paypal-secure-login.verify-account.co.uk/login.php?id=8834",
        "not_available",
        "https://bit.ly/3xF9kLp",
        "https://user@example.com/login",
        "https://test123.com/page456",
    ]
})

engineer = FeatureEngineer(df)
result = engineer.create_url_features()

# Display all URL-related features
print(
    result[
        [
            "url",
            "url_is_missing",
            "url_length",
            "hostname_length",
            "path_length",
            "num_dots",
            "num_hyphens",
            "num_at_symbols",
            "num_digits",
        ]
    ]
)

# Verify expected columns exist
expected_columns = [
    "url_is_missing",
    "url_length",
    "hostname_length",
    "path_length",
    "num_dots",
    "num_hyphens",
    "num_at_symbols",
    "num_digits",
]

for col in expected_columns:
    assert col in result.columns, f"Missing column: {col}"

# Google URL
assert result.loc[0, "url_is_missing"] == 0
assert result.loc[0, "num_dots"] == 2          # www.google.com
assert result.loc[0, "num_hyphens"] == 0
assert result.loc[0, "num_at_symbols"] == 0
assert result.loc[0, "num_digits"] == 0
assert result.loc[0, "hostname_length"] == 14  # www.google.com
assert result.loc[0, "path_length"] == 7       # /search

# Phishing-style URL
assert result.loc[1, "url_is_missing"] == 0
assert result.loc[1, "num_dots"] == 4
assert result.loc[1, "num_hyphens"] == 3
assert result.loc[1, "num_at_symbols"] == 0
assert result.loc[1, "num_digits"] == 4        # 8834
assert result.loc[1, "url_length"] > result.loc[0, "url_length"]

# Missing URL
assert result.loc[2, "url_is_missing"] == 1
assert result.loc[2, "url_length"] == -1
assert result.loc[2, "hostname_length"] == -1
assert result.loc[2, "path_length"] == -1
assert result.loc[2, "num_dots"] == -1
assert result.loc[2, "num_hyphens"] == -1
assert result.loc[2, "num_at_symbols"] == -1
assert result.loc[2, "num_digits"] == -1

# Bitly URL
assert result.loc[3, "url_is_missing"] == 0
assert result.loc[3, "num_dots"] == 1          # bit.ly
assert result.loc[3, "num_hyphens"] == 0
assert result.loc[3, "num_at_symbols"] == 0
assert result.loc[3, "num_digits"] == 2        # 3 and 9

# URL containing '@'
assert result.loc[4, "url_is_missing"] == 0
assert result.loc[4, "num_at_symbols"] == 1
assert result.loc[4, "num_hyphens"] == 0
assert result.loc[4, "num_digits"] == 0
assert result.loc[4, "num_dots"] == 1          # example.com

# URL containing digits in host and path
assert result.loc[5, "url_is_missing"] == 0
assert result.loc[5, "num_at_symbols"] == 0
assert result.loc[5, "num_hyphens"] == 0
assert result.loc[5, "num_digits"] == 6        # 123 + 456
assert result.loc[5, "num_dots"] == 1          # test123.com

print("\n All URL Feature assertions passed")