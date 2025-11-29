import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef
} from "react";
import Button from "./button";
import reject from "../icons/reject.png";

const DisplayImages = forwardRef((props, ref) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fullsizeImage, setFullsizeImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [filterOpt, setFilter] = useState("");
  const { onImageSelect } = props;

  // Crop selection
  const [selection, setSelection] = useState({ active: false, x: 0, y: 0, w: 0, h: 0 });
  const startPoint = useRef({ x: 0, y: 0 });
  const imgRef = useRef();

  // Get filtered images from db
  const fetchImages = async (filter = "") => {
    setLoading(true); 
    setFilter(filter);
    try {
      if (!window.electronAPI?.fetchImagesFiltered) return;
      const imagesWithMeta = await window.electronAPI.fetchImagesFiltered(filter);
      setImages(imagesWithMeta);
      setFullsizeImage(null);
      setSelection({ active: false, x: 0, y: 0, w: 0, h: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Expose reload() to parent
 useImperativeHandle(ref, () => ({
  reload(filter) {
    fetchImages(filter); // use the passed filter
  }
}));


  useEffect(() => {
    fetchImages();
  }, []);

  const handleClick = (image) => {
    setSelectedImage(image);
    if (onImageSelect) onImageSelect(image);
  };

  const handleDoubleClick = (image) => {
    setFullsizeImage(image.src);
  };

  const closeFullsize = () => {
    setFullsizeImage(null);
    setSelection({ active: false, x: 0, y: 0, w: 0, h: 0 });
  };

  //Crop selection handlers
  const startSelection = (e) => {
    e.stopPropagation(); //preventing bubbling
    const rect = imgRef.current.getBoundingClientRect();
    startPoint.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setSelection({ active: true, x: startPoint.current.x, y: startPoint.current.y, w: 0, h: 0 });
  };

  const updateSelection = (e) => {
    if (!selection.active) return;
    const rect = imgRef.current.getBoundingClientRect();
    const currX = e.clientX - rect.left;
    const currY = e.clientY - rect.top;
    setSelection({
      ...selection,
      w: Math.abs(currX - startPoint.current.x),
      h: Math.abs(currY - startPoint.current.y),
      x: Math.min(currX, startPoint.current.x),
      y: Math.min(currY, startPoint.current.y)
    });
  };

  const endSelection = async () => {
    if (!selection.active || selection.w === 0 || selection.h === 0) {
      setSelection({ ...selection, active: false });
      return;
    }

    // Upload crop automatically
    const canvas = document.createElement("canvas");
    canvas.width = selection.w;
    canvas.height = selection.h;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(
      imgRef.current,
      selection.x * (imgRef.current.naturalWidth / imgRef.current.width),
      selection.y * (imgRef.current.naturalHeight / imgRef.current.height),
      selection.w * (imgRef.current.naturalWidth / imgRef.current.width),
      selection.h * (imgRef.current.naturalHeight / imgRef.current.height),
      0,
      0,
      selection.w,
      selection.h
    );

    const base64 = canvas.toDataURL("image/png").replace("data:image/png;base64,", "");

    try {
      const id = await window.electronAPI.saveImage({
        base64,
        filename: `crop_${Date.now()}.png`
      });
      alert("Uploaded cropped image with ID: " + id);
      fetchImages(filterOpt);
    } catch (err) {
      console.error("Upload failed", err);
    }

    setSelection({ active: false, x: 0, y: 0, w: 0, h: 0 });
  };

  return (
    <div style={{ padding: 20 }}>

      {loading && <p>Loading images...</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-start" }}>
        {images.length > 0 ? (
          images.map((img) => (
            <div key={img.id} style={{ position: "relative" }}>
              <img
                src={img.src}
                alt={img.filename}
                style={{
                  maxWidth: 200,
                  maxHeight: 200,
                  objectFit: "cover",
                  border: selectedImage?.id === img.id ? "3px solid #007bff" : "1px solid #ccc",
                  borderRadius: 4,
                  cursor: "pointer"
                }}
                onClick={() => handleClick(img)}
                onDoubleClick={() => handleDoubleClick(img)}
              />
            </div>
          ))
        ) : (
          !loading && <p>No images found.</p>
        )}
      </div>

      {/* Fullsize modal */}
      {fullsizeImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000
          }}
          onClick={closeFullsize}
        >
          <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <Button
              title="Exit"
              imgClassName="exit"
              imgSrc={reject}
              onClick={closeFullsize}
            />

            <img
              ref={imgRef}
              src={fullsizeImage}
              alt="Full Size"
              draggable={false}
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                borderRadius: 6,
                boxShadow: "0 0 20px rgba(0,0,0,0.5)",
                cursor: "crosshair"
              }}
              onMouseDown={startSelection}
              onMouseMove={updateSelection}
              onMouseUp={endSelection}
            />

            {(selection.active || selection.w > 0) && (
              <div
                style={{
                  position: "absolute",
                  border: "2px dashed #00ff00",
                  backgroundColor: "rgba(0,255,0,0.2)",
                  left: selection.x,
                  top: selection.y,
                  width: selection.w,
                  height: selection.h,
                  pointerEvents: "none",
                  zIndex: 1500
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default DisplayImages;
