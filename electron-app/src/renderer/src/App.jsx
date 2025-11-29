import upload from './icons/upload.png';
import filter from './icons/filter.png';
import reject from './icons/reject.png';
import reload from './icons/reload.png'
import './App.css';
import Button from './components/button.jsx'
import Dropdown from './components/dropdown.jsx'
import _ from 'lodash';
import React, { useState, useRef } from 'react';
import Popup from 'reactjs-popup';
import DisplayImage from './components/displayImage.jsx';

function App() {
  const [isVisible, setIsVisible] = useState(false); //dropdown is visible
//  const [file, setFile] = useState(null); //file input **not using
  const displayRef = useRef();
  const [selectedMeta, setSelectedMeta] = useState(null); // selected image meta data
  const [filterOpt, setFilter] = useState(""); // filter type

 
  const handleFilterSelect = (value) => {
    setFilter(value);           // update App state
    if (displayRef.current?.reload) {
      displayRef.current.reload(value);
    }
  };
  
  /*function handleFileInput(e) {
    const fileObj = e.target.files[0];

    setFile(URL.createObjectURL(fileObj));

    if (window.electronAPI?.getFilePath) {
      const realPath = window.electronAPI.getFilePath(fileObj);
      console.log("FILE PATH:", realPath);
    } else {
      console.log("electronAPI not available");
    }
  }
*/
  function toggleVisibility() {
    setIsVisible(!isVisible); // Update state
  };
  return (
    <>
      <div className="header">CTRL-View</div>
      <section className="layout">
        <div className="navInfo">
           <h2>Meta Data</h2>
           {/* Convert to component */}
            {selectedMeta ? (
              <div>
                <p>Filename: {selectedMeta.filename}</p>
                <p>Filetype: {selectedMeta.filetype}</p>
                <p>Size: {selectedMeta.sizeBytes} bytes</p>
                <p>Uploaded By: {selectedMeta.uploadUser}</p>
                <p>Corrupt: {selectedMeta.corrupt}</p>
              </div>
            ) : (
              <p>No image selected.</p>
            )}
          <Button
            title="Batch Insert"
            imgSrc= {upload}
            imgClassName= "upload"
            onClick={async () => {
              const result = await window.electronAPI.runBatchInsert();
              alert(result);
            }}
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
          onClick={() => displayRef.current?.reload(filterOpt)}
        />
        <DisplayImage 
          ref={displayRef}
          onImageSelect={(img) => setSelectedMeta(img)}
        />
      </div>

      </section>
      <div className="footer">Logs</div>
    </>
  );
} 


export default App;
