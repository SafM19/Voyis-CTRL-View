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
  const [filterOpt, setFilter] = useState([]);
  const [fullsize, setFullsize] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const { onImageSelect, addLog } = props;

  // Crop state
  const [crop, setCrop] = useState({
    active: false,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  });

  // Pan + zoom state
  const imgRef = useRef();
  const containerRef = useRef();
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const translate = useRef({ x: 0, y: 0 });
  const scale = useRef(1);

  // Convert base64 URLs to Blob URL for display
  const toURL = (dataUrl) => {
    const [meta, base64] = dataUrl.split(",");
    const mime = meta.split(":")[1].split(";")[0];
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return {
      url: URL.createObjectURL(new Blob([bytes], { type: mime })), // blob URL for display
      base64: dataUrl, // keep original base64 for export
    };
  };

  // Fetch images
  const fetchImages = async (filters = []) => {
    setLoading(true);
    setFilter(filters);

    try {
      const rows = await window.electronAPI.fetchImagesFiltered(filters);
      setImages(
        rows.map((img) => {
          const { url, base64 } = toURL(img.src);
          return { ...img, src: base64, url };
        })
      );
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Expose reload() and getCurrentImages()
  useImperativeHandle(ref, () => ({
    reload(filter) {
      fetchImages(filter);
    },
    getCurrentImages() {
      return images;
    },
  }));

  useEffect(() => {
    fetchImages();
  }, []);

  // Close fullsize on ESC
  useEffect(() => {
    const keyHandler = (e) => {
      if (e.key === "Escape") closeFullsize();
    };
    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, []);

  const openFullsize = (img) => {
    setFullsize(img.url); // use blob URL for display
    translate.current = { x: 0, y: 0 };
    scale.current = 1;

    if (imgRef.current) {
      imgRef.current.style.transform = "translate(0px,0px) scale(1)";
    }
  };

  const closeFullsize = () => {
    setFullsize(null);
    setCrop({
      active: false,
      startX: 0,
      startY: 0,
      x: 0,
      y: 0,
      w: 0,
      h: 0,
    });
  };

  // PAN + ZOOM 
  const handleWheel = (e) => {
    if (!imgRef.current) return;
    e.preventDefault();
    const zoomIntensity = 0.1;
    const delta = e.deltaY < 0 ? 1 : -1;

    scale.current = Math.min(5, Math.max(0.2, scale.current + delta * zoomIntensity));
    imgRef.current.style.transform = `translate(${translate.current.x}px, ${translate.current.y}px) scale(${scale.current})`;
  };

  const handleMouseDown = (e) => {
    if (!imgRef.current) return;
    // cropping
    if (e.ctrlKey) { 
      const rect = imgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setCrop({ active: true, startX: x, startY: y, x, y, w: 0, h: 0 });
      return;
    }

    // panning
    isPanning.current = true;
    panStart.current = { x: e.clientX - translate.current.x, y: e.clientY - translate.current.y };
  };

  const handleMouseMove = (e) => {
    if (!imgRef.current) return;
    // cropping
    if (crop.active) { 
      const rect = imgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setCrop((c) => ({
        ...c,
        x: Math.min(c.startX, x),
        y: Math.min(c.startY, y),
        w: Math.abs(x - c.startX),
        h: Math.abs(y - c.startY),
      }));
      return;
    }
    // panning
    if (isPanning.current) {
      translate.current = { x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y };
      imgRef.current.style.transform = `translate(${translate.current.x}px, ${translate.current.y}px) scale(${scale.current})`;
    }
  };

  const handleMouseUp = async () => {
    if (crop.active && crop.w > 0 && crop.h > 0) {
      const base64 = await cropImage();
      try {
        addLog(`Saving cropped image...`);
        await window.electronAPI.saveCroppedImage({ base64, filename: `crop_${Date.now()}.png` });
        fetchImages(filterOpt);
      } catch (err) {
        addLog(`Crop upload error: ${err}`);
        console.error("Crop upload error:", err);
      }
    }

    setCrop({ active: false, startX: 0, startY: 0, x: 0, y: 0, w: 0, h: 0 });
    isPanning.current = false;
  };

  const cropImage = async () => {
    const img = imgRef.current;
    const canvas = document.createElement("canvas");

    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    canvas.width = crop.w;
    canvas.height = crop.h;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, crop.x * scaleX, crop.y * scaleY, crop.w * scaleX, crop.h * scaleY, 0, 0, crop.w, crop.h);

    return canvas.toDataURL("image/png").replace("data:image/png;base64,", "");
  };

  //Render
  return (
    <div className="display-container">
      {loading && <p className="loading">Loading images...</p>}

      <div className="image-grid">
        {images.map((img) => (
          <img
            key={img.id}
            src={img.url}
            alt={img.filename}
            className={`image-thumb ${selectedImage?.id === img.id ? "selected" : ""}`}
            onClick={() => {
              setSelectedImage(img);
              onImageSelect?.(img);
            }}
            onDoubleClick={() => openFullsize(img)}
          />
        ))}
      </div>

      {fullsize && (
        <div
          ref={containerRef}
          className="fullscreen-overlay"
          onClick={closeFullsize}
        >
          <div className="fullscreen-wrapper" onClick={(e) => e.stopPropagation()}>
            <img
              ref={imgRef}
              src={fullsize}
              draggable={false}
              className="fullscreen-image"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            />

            {(crop.active || crop.w > 0) && (
              <div
                className="crop-overlay"
                style={{
                  left: crop.x,
                  top: crop.y,
                  width: crop.w,
                  height: crop.h,
                }}
              ></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default DisplayImages;
