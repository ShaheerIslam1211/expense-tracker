# ocr_image_to_text

![PyPI version](https://img.shields.io/pypi/v/smartocr.svg)

It is a project for ocr fetch details correctly

* Created by **[M.Shaheer](https://github.com/ShaheerIslam1211)**
  * PyPI: https://pypi.org/user/ShaheerIslam1211/
* PyPI package: https://pypi.org/project/smartocr/
* Free software: MIT License

## Features

* TODO

## Documentation

Documentation is built with [Zensical](https://zensical.org/) and deployed to GitHub Pages.

* **Live site:** https://ShaheerIslam1211.github.io/smartocr/
* **Preview locally:** `just docs-serve` (serves at http://localhost:8000)
* **Build:** `just docs-build`

API documentation is auto-generated from docstrings using [mkdocstrings](https://mkdocstrings.github.io/).

Docs deploy automatically on push to `main` via GitHub Actions. To enable this, go to your repo's Settings > Pages and set the source to **GitHub Actions**.

## Development

To set up for local development:

```bash
# Clone your fork
git clone git@github.com:your_username/smartocr.git
cd smartocr

# Install in editable mode with live updates
uv tool install --editable .
```

This installs the CLI globally but with live updates - any changes you make to the source code are immediately available when you run `smartocr`.

Run tests:

```bash
uv run pytest
```

Run quality checks (format, lint, type check, test):

```bash
just qa
```

## Author

ocr_image_to_text was created in 2026 by M.Shaheer.

Built with [Cookiecutter](https://github.com/cookiecutter/cookiecutter) and the [audreyfeldroy/cookiecutter-pypackage](https://github.com/audreyfeldroy/cookiecutter-pypackage) project template.
