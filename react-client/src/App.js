import { useState } from "react";

const regx = /^data:(.*,)?/;

async function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [isDoc, setIsDoc] = useState(true);
  const [image, setImage] = useState("");
  const [text, setText] = useState([]);
  const [error, setError] = useState("");
  const [year, setYear] = useState("");
  const [age, setAge] = useState("");

  const readFile = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      setImage(await toBase64(e.target.files[0]));
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const ocrSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const imgB64 = image.replace(regx, "");
      const res = await fetch("/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDoc, imgB64 }),
        mode: "same-origin"
      });
      const { error, data } = await res.json();
      if (!res.ok) throw new Error(`Error: ${error} - Code: ${res.status}`);
      else setText(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={ocrSubmit}>
        <label>
          <input type="checkbox" checked={isDoc} onChange={(e) => setIsDoc(e.target.checked)} />
          Document ?
        </label>
        <input type="file" accept="image/*" onChange={readFile} required />
        <button type="submit" disabled={loading}>
          OCR
        </button>
      </form>
      <p>{error}</p>
      <textarea rows={5} placeholder="Anything you want to edit here ..."></textarea>
      <input
        type="text"
        placeholder="Year of Birth"
        value={year}
        onChange={(e) =>
          setYear(e.target.value) ?? setAge((new Date().getFullYear() - Number(e.target.value)).toString())
        }
      />{" "}
      - <strong>{age}</strong>
      <pre>{text.join("\r\n")}</pre>
      <img src={image} alt="Image" />
    </>
  );
}
