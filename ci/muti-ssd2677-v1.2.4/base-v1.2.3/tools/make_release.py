#!/usr/bin/env python3
"""Collect PlatformIO output and create a one-address merged flash image."""
from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def find_first(candidates: list[Path], pattern: str | None = None) -> Path:
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    if pattern:
        for base in [Path.home() / ".platformio", ROOT / ".pio"]:
            if base.exists():
                matches = list(base.rglob(pattern))
                if matches:
                    return matches[0]
    raise FileNotFoundError(f"unable to find {pattern or candidates}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env", default="c3_promini_usb")
    args = parser.parse_args()

    build = ROOT / ".pio" / "build" / args.env
    release = ROOT / "firmware"
    release.mkdir(exist_ok=True)

    firmware = find_first([build / "firmware.bin"])
    partitions = find_first([build / "partitions.bin"])
    bootloader = find_first([build / "bootloader.bin"])
    boot_app0 = find_first([], "boot_app0.bin")
    esptool = find_first([], "esptool.py")

    copied: list[Path] = []
    for source, target_name in [
        (firmware, "firmware.bin"),
        (partitions, "partitions.bin"),
        (bootloader, "bootloader.bin"),
        (boot_app0, "boot_app0.bin"),
    ]:
        target = release / target_name
        shutil.copy2(source, target)
        copied.append(target)

    for optional_name in ["firmware.elf", "firmware.map"]:
        source = build / optional_name
        if source.is_file():
            target = release / optional_name
            shutil.copy2(source, target)
            copied.append(target)

    merged = release / "merged-flash.bin"
    command = [
        sys.executable,
        str(esptool),
        "--chip",
        "esp32c3",
        "merge_bin",
        "--output",
        str(merged),
        "--flash_mode",
        "dio",
        "--flash_size",
        "4MB",
        "0x0",
        str(release / "bootloader.bin"),
        "0x8000",
        str(release / "partitions.bin"),
        "0xE000",
        str(release / "boot_app0.bin"),
        "0x10000",
        str(release / "firmware.bin"),
    ]
    print(" ".join(command))
    subprocess.check_call(command)
    copied.append(merged)

    flash_args = release / "flash_args.txt"
    flash_args.write_text(
        "# Separate images\n"
        "0x0000 bootloader.bin\n"
        "0x8000 partitions.bin\n"
        "0xE000 boot_app0.bin\n"
        "0x10000 firmware.bin\n\n"
        "# Preferred complete image\n"
        "0x0000 merged-flash.bin\n",
        encoding="utf-8",
    )
    copied.append(flash_args)

    sums = release / "SHA256SUMS.txt"
    sums.write_text("".join(f"{sha256(path)}  {path.name}\n" for path in copied if path.is_file()), encoding="utf-8")

    info = release / "BUILD_INFO.txt"
    info.write_text(
        "Muti-SSD2677-LocalWeb-C3 v1.2.3\n"
        f"PlatformIO environment: {args.env}\n"
        "Board: esp32-c3-devkitm-1\n"
        "Platform: espressif32@6.9.0\n"
        "Framework: Arduino-ESP32 2.0.17\n"
        "Flash mode: DIO, 4MB\n"
        "Merged image offset: 0x0000\n",
        encoding="utf-8",
    )
    print(f"release collected in {release}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
