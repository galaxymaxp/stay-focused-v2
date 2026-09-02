import argparse
import importlib.metadata
import json


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.document_converter import DocumentConverter, PdfFormatOption
    from docling.datamodel.base_models import InputFormat

    options = PdfPipelineOptions()
    options.do_ocr = True
    options.do_table_structure = True
    converter = DocumentConverter(
        format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=options)}
    )
    result = converter.convert(args.input)
    with open(args.output, "w", encoding="utf-8") as output:
        json.dump(
            {
                "native": result.document.export_to_dict(),
                "parserVersion": importlib.metadata.version("docling"),
            },
            output,
            ensure_ascii=False,
        )


if __name__ == "__main__":
    main()
