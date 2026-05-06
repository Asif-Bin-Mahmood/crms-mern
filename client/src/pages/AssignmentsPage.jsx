import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';

export default function AssignmentsPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get('/repairs/assignments/me').then((r) => setItems(r.data.data.assignments));
  }, []);

  return (
    <div>
      <h1>My assignments</h1>
      <div className="card">
        <ul>
          {items.map((a) => (
            <li key={a._id}>
              <Link to={`/repairs/${a.repairRequestId?._id || a.repairRequestId}`}>
                Repair {String(a.repairRequestId?._id || a.repairRequestId)}
              </Link>{' '}
              — {a.roleInRepair}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
