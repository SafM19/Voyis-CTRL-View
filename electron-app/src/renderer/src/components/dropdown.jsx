import '../App.css';
import React from 'react';
import PropTypes from 'prop-types';


function Dropdown({ isVisible, onSelect, selected }) {
  if (!isVisible) return null;

  const options = ["jpg", "jpeg", "png", "tif", "all"];

  return (
    <div className="dropdown">
      {options.map((opt) => {
        const isActive = selected === opt || (selected === "" && opt === "all");
        return (
          <div
            key={opt}
            className={`dropdown-item ${isActive ? "active" : ""}`}
            onClick={() => onSelect(opt === "all" ? "" : opt)}
          >
            {opt.toUpperCase()}
          </div>
        );
      })}
    </div>
  );
}


Dropdown.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired
};

export default Dropdown;
