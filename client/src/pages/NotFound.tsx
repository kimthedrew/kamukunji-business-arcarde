import React from 'react';
import { useNavigate } from 'react-router-dom';
import './NotFound.css';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="not-found">
      <div className="not-found-content">
        <div className="not-found-icon">👟</div>
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>Looks like this page walked off the shelf. Let's get you back to the store.</p>
        <div className="not-found-actions">
          <button onClick={() => navigate('/')} className="btn btn-primary">Back to Home</button>
          <button onClick={() => navigate('/search')} className="btn btn-outline">Browse Shoes</button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
