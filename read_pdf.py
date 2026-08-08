from pypdf import PdfReader

reader = PdfReader(r"C:\Users\Rahil Mulani\Downloads\pdf (2).pdf")
print(f"Number of pages: {len(reader.pages)}")

text = ""
for i, page in enumerate(reader.pages):
    text += f"--- Page {i+1} ---\n"
    text += page.extract_text() + "\n"

with open(r"c:\Users\Rahil Mulani\bhiv-master\pdf_content.txt", "w", encoding="utf-8") as f:
    f.write(text)

print("PDF successfully read and saved to pdf_content.txt")
