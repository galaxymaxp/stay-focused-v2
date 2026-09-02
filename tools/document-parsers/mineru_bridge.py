import argparse
import importlib.metadata
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    sibling_candidates = [
        Path(sys.executable).with_name("mineru.exe"),
        Path(sys.executable).with_name("mineru"),
    ]
    executable = next((str(path) for path in sibling_candidates if path.exists()), None)
    executable = executable or shutil.which("mineru") or shutil.which("mineru.exe")
    if executable is None:
        raise SystemExit(2)
    with tempfile.TemporaryDirectory(prefix="stay-focused-mineru-output-") as directory:
        command = [executable, "-p", args.input, "-o", directory, "-b", "pipeline", "-m", "auto"]
        result = subprocess.run(
            command,
            env=os.environ.copy(),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        if result.returncode != 0:
            raise SystemExit(result.returncode)
        candidates = sorted(Path(directory).rglob("*_content_list.json"))
        if not candidates:
            raise SystemExit(3)
        with candidates[0].open("r", encoding="utf-8") as source:
            content_list = json.load(source)
        with open(args.output, "w", encoding="utf-8") as output:
            json.dump(
                {
                    "contentList": content_list,
                    "parserVersion": importlib.metadata.version("mineru"),
                },
                output,
                ensure_ascii=False,
            )


if __name__ == "__main__":
    main()
