import React from 'react';

const ModeToggler = ({ large, onChange }) => (
  <div className="flex items-center gap-4">
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        name="mode"
        value="standard"
        checked={!large}
        onChange={() => onChange(false)}
        className="form-radio text-indigo-600"
      />
      <span>Standard Mode</span>
    </label>

    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        name="mode"
        value="large"
        checked={large}
        onChange={() => onChange(true)}
        className="form-radio text-indigo-600"
      />
      <span>Large File Mode</span>
    </label>
  </div>
);

export default ModeToggler;
