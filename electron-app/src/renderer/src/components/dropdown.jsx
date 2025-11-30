import '../App.css';
import React from 'react';
import PropTypes from 'prop-types';

function Dropdown({ isVisible, onSelect, selected }) {
  if (!isVisible) return null;

  const options = ["jpg", "jpeg", "png", "tif"];

  const handleToggle = (option) => {
    let newSelected;
    if (selected.includes(option)) {
      // remove option
      newSelected = selected.filter((o) => o !== option);
    } else {
      // add option
      newSelected = [...selected, option];
    }
    onSelect(newSelected);
  };

  return (
    <div className="dropdown">
      {options.map((option) => (
        <div key={option} onClick={() => handleToggle(option)} className="dropdown-item">
          <input
            type="checkbox"
            checked={selected.includes(option)}
            readOnly
          />
          <label>{option}</label>
        </div>
      ))}
    </div>
  );
}

Dropdown.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  selected: PropTypes.array.isRequired,
};

export default Dropdown;
