import '../App.css';
import _ from 'lodash';
import React from 'react'
import props from 'prop-types';

function Button(props) {
    return(
     <button 
        onClick={props.onClick} 
        className="button" 
        title={props.title}>    
        <img className={props.imgClassName} src={props.imgSrc}/>    
    </button>
    )
} 

export default Button;
