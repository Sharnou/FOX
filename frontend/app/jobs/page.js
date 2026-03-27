'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
const API = process.env.NEXT_PUBLIC_API_URL || '';
export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const country = typeof window !== 'undefined' ? localStorage.getItem('country') || 'EG' : 'EG';
  useEffect(() => { axios.get(`${API}/api/jobs`, { params: { country } }).then(r => setJobs(r.data)); }, []);
  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center gap-3 mb-6"><button onClick={() => history.back()} className="text-brand font-bold">←</button><h1 className="text-2xl font-bold text-brand">💼 الوظائف</h1><a href="/jobs/post" className="mr-auto bg-brand text-white px-4 py-2 rounded-xl text-sm">+ نشر وظيفة</a></div>
      <div className="space-y-4">
        {jobs.map(j => (<div key={j._id} className="bg-white rounded-xl shadow p-4"><h2 className="font-bold text-lg">{j.title}</h2><p className="text-gray-600 text-sm mt-1">{j.description}</p><div className="flex gap-4 mt-3 text-sm text-gray-500"><span>📍 {j.city}</span><span>💰 {j.price} {j.currency}</span></div><a href={`/chat?target=${j.userId}`} className="mt-3 block bg-brand text-white text-center py-2 rounded-xl text-sm font-bold">التواصل</a></div>))}
      </div>
    </div>
  );
}
