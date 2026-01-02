import React from 'react';
import { useApi } from '../context/ApiContext';

const defaultArabicLangs = [
  'arb_Arab', // Modern Standard Arabic
  'arz_Arab', // Egyptian Arabic
  'ary_Arab', // Moroccan Arabic
  'ajp_Arab', // South-Levantine Arabic
  'apc_Arab', // North-Levantine Arabic
  'acm_Arab', // Mesopotamian Arabic
  'acw_Arab', // Hijazi Arabic
  'acv_Arab', // Najdi Arabic
  'aeb_Arab', // Tunisian Arabic
  'apd_Arab', // Sudanese Arabic
  'acq_Arab', // Taʿizzi-Adeni Arabic
];

const LanguageSelector = ({ value, onChange }) => {
  const { languages } = useApi();
  const [search, setSearch] = React.useState('');
  const list = (languages.length ? languages : defaultArabicLangs).filter((l) =>
    l.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <label htmlFor="language" className="block text-sm mb-1">
        Language
      </label>
      <input
        type="text"
        placeholder="Search language"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-2 w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:ring"
      />
      <select
        id="language"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size="6"
        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:ring h-48"
      >
        <option value="" disabled>
          Select language
        </option>
        {list.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
