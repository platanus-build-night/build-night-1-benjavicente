use lopdf::Document;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn remove_pdf_password(
    pdf_bytes: &[u8],
    passwords: Box<[JsValue]>,
) -> Result<Vec<u8>, JsValue> {
    let passwords: Vec<String> = passwords
        .into_vec()
        .into_iter()
        .filter_map(|p| p.as_string())
        .collect();

    remove_pdf_password_from_bytes(pdf_bytes.to_vec(), passwords).map_err(|e| JsValue::from_str(&e))
}

pub fn remove_pdf_password_from_bytes(
    pdf_bytes: Vec<u8>,
    passwords: Vec<String>,
) -> Result<Vec<u8>, String> {
    let mut doc = Document::load_mem(&pdf_bytes).map_err(|e| format!("Load error: {}", e))?;

    if doc.decrypt(b"").is_ok() {
        return save_decrypted_doc_rust(doc);
    }

    for password in passwords {
        let mut attempt =
            Document::load_mem(&pdf_bytes).map_err(|e| format!("Reload error: {}", e))?;
        if attempt.decrypt(password.as_bytes()).is_ok() {
            return save_decrypted_doc_rust(attempt);
        }
    }

    Err("Failed to decrypt PDF with provided passwords".into())
}

/// Helper for saving decrypted Document in pure Rust
fn save_decrypted_doc_rust(mut doc: Document) -> Result<Vec<u8>, String> {
    doc.trailer.remove(b"Encrypt");
    let mut output = Vec::new();
    doc.save_to(&mut output)
        .map_err(|e| format!("Save error: {}", e))?;
    Ok(output)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    #[test]
    fn test_remove_pdf_password_from_bytes() {
        let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        path.push("tests/cartola-banco-chile.pdf");

        let pdf = fs::read(&path).expect("Failed to read test PDF");
        let passwords = vec![
            "".to_string(),
            "wrong".to_string(),
            "correct_password".to_string(),
        ];

        let result = remove_pdf_password_from_bytes(pdf, passwords);
        assert!(result.is_ok(), "Decryption failed: {:?}", result.err());
    }
}
