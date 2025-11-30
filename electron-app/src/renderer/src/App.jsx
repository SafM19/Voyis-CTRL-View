import React, { useState, useRef, useEffect } from "react";
import upload from './icons/upload.png';
import filter from './icons/filter.png';
import reject from './icons/reject.png';
import reload from './icons/reload.png';
import share from './icons/share.png';
import './App.css';
import Button from './components/button.jsx';
import Dropdown from './components/dropdown.jsx';
import DisplayImage from './components/displayImage.jsx';

function App() {
  const [isVisible, setIsVisible] = useState(false);
  const displayRef = useRef();
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [filterOpt, setFilterOpt] = useState([]);
  
  const [logs, setLogs] = useState([]);
  const footerRef = useRef();

  // Logging
  const addLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  // Listen for logs from main process
  useEffect(() => {
    if (window.electronAPI?.onMainLog) {
      window.electronAPI.onMainLog((msg) => addLog(msg));
    }
  }, []);

  // Scroll footer to bottom on new log
  useEffect(() => {
    if (footerRef.current) {
      footerRef.current.scrollTop = footerRef.current.scrollHeight;
    }
  }, [logs]);

  // Filtering
  const handleFilterSelect = (selectedArray) => {
    setFilterOpt(selectedArray);
    if (displayRef.current?.reload) {
      displayRef.current.reload(selectedArray);
      addLog(`Filter applied: ${selectedArray.join(", ") || "none"}`);
    }
  };
  
  const toggleVisibility = () => setIsVisible(!isVisible);

  const handleShareClick = async () => {
    if (!displayRef.current?.getCurrentImages) {
      addLog("Export not available");
      return;
    }

    const folder = await window.electronAPI.chooseExportFolder();
    if (!folder) {
      addLog("Export canceled by user");
      return;
    }

    addLog(`Export folder selected: ${folder}`);

    const images = displayRef.current.getCurrentImages();
    const result = await window.electronAPI.exportImages({ images, folder });

    if (result.success) {
      addLog("Images exported successfully!");
    } else {
      addLog(`Export failed: ${result.error}`);
    }
  };

 const handleBatchInsert = async () => {
  const result = await window.electronAPI.runBatchInsert();

  if (!result.success) {
    addLog("Batch Insert failed.");
  }
};



  // Render
  return (
    <>
      <div className="header">CTRL-View</div>
      <section className="layout">
        <div className="navInfo">
          <h2>Meta Data</h2>
          {selectedMeta ? (
            <div>
              <p>Filename: {selectedMeta.filename}</p>
              <p>Filetype: {selectedMeta.filetype}</p>
              <p>Size: {selectedMeta.sizeBytes} bytes</p>
              <p>Uploaded By: {selectedMeta.uploadUser}</p>
              <p>Corrupt: {selectedMeta.corrupt}</p>
            </div>
          ) : <p>No image selected.</p>}

          <Button
            title="Batch Insert"
            imgSrc={upload}
            imgClassName="upload"
            onClick={handleBatchInsert}
          />
        </div>

        <div className="body">
          <Button
            title="Filter"
            imgClassName="filter"
            imgSrc={filter}
            onClick={toggleVisibility}
          />
          <Dropdown
            isVisible={isVisible}
            onSelect={handleFilterSelect}
            selected={filterOpt}
          />
          <Button
            title="Reload"
            imgClassName="reload"
            imgSrc={reload}
            onClick={() => {
              displayRef.current?.reload(filterOpt);
              addLog("Reloaded images");
            }}
          />
          <Button
            title="Share"
            imgClassName="share"
            imgSrc={share}
            onClick={handleShareClick}
          />
          <DisplayImage
            ref={displayRef}
            onImageSelect={(img) => {
              setSelectedMeta(img);
              addLog(`Selected image: ${img.filename}`);
            }}
            addLog={addLog} // pass log function to DisplayImage
          />
        </div>
      </section>
      <div className="footer">Logs
        <div className="logs" >
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      </div>
    </>
  );
}

export default App;
