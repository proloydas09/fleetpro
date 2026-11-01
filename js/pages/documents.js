// =============================================
// FleetPro – Documents Page
// =============================================

function renderDocuments() {
  const today = new Date();
  const getStatusColor = (days) => days < 0 ? 'expired' : days <= 30 ? 'expiring' : 'ok';

  const docRows = [];
  DB.cars.forEach(car => {
    const docs = [
      { name: 'Insurance', expiry: car.insurance.expiry, icon: '🛡️', number: car.insurance.number },
      { name: 'Permit', expiry: car.permit.expiry, icon: '📄', number: car.permit.number },
      { name: 'Pollution (PUC)', expiry: car.pollution.expiry, icon: '🌿', number: '' },
      { name: 'Fitness Certificate (CF)', expiry: car.cf?.expiry, icon: '✅', number: '' },
      { name: 'Tax', expiry: car.tax?.expiry, icon: '💳', number: '' },
      { name: 'RC', expiry: car.rc.expiry, icon: '📋', number: car.rc.number },
    ];
    docs.filter(doc => doc.expiry).forEach(doc => {
      const days = daysUntil(doc.expiry);
      docRows.push({ car, doc, days, status: getStatusColor(days) });
    });
  });

  DB.drivers.forEach(d => {
    const days = daysUntil(d.licenseExpiry);
    docRows.push({
      car: null,
      driver: d,
      doc: { name: 'Driving License', expiry: d.licenseExpiry, icon: '🪪', number: d.license },
      days,
      status: getStatusColor(days)
    });
  });

  // Sort: expired first, then expiring soon, then ok
  docRows.sort((a, b) => a.days - b.days);

  const urgent = docRows.filter(r => r.days < 0 || r.days <= 30);
  const ok = docRows.filter(r => r.days > 30);

  function renderDocRow(r) {
    const st = expiryStatus(r.doc.expiry);
    return `
      <div class="doc-card" style="margin-bottom:8px;">
        <div class="doc-icon">${r.doc.icon}</div>
        <div class="doc-info">
          <div class="doc-name">${r.doc.name}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:2px;">
            ${r.car ? r.car.plate : r.driver?.name}
            ${r.doc.number ? ` • ${r.doc.number}` : ''}
          </div>
          <div class="doc-exp ${st.cls}">${st.label}</div>
        </div>
        <div>
          ${r.days < 0 ? '<span class="badge badge-rejected">Expired</span>' : r.days <= 30 ? '<span class="badge badge-pending">Renew</span>' : '<span class="badge badge-approved">Valid</span>'}
        </div>
      </div>
    `;
  }

  const html = `
    <div class="page" id="docs-page">
      <!-- Summary -->
      <div style="display:flex;gap:10px;padding:0 20px 16px;overflow-x:auto;scrollbar-width:none;">
        <div style="flex-shrink:0;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:12px 16px;min-width:100px;">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Expired</div>
          <div style="font-size:20px;font-weight:800;color:var(--accent-red);">${docRows.filter(r=>r.days<0).length}</div>
        </div>
        <div style="flex-shrink:0;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.25);border-radius:12px;padding:12px 16px;min-width:100px;">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Expiring (30d)</div>
          <div style="font-size:20px;font-weight:800;color:var(--accent-orange);">${docRows.filter(r=>r.days>=0&&r.days<=30).length}</div>
        </div>
        <div style="flex-shrink:0;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:12px 16px;min-width:100px;">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Valid</div>
          <div style="font-size:20px;font-weight:800;color:var(--accent-green);">${docRows.filter(r=>r.days>30).length}</div>
        </div>
      </div>

      ${urgent.length > 0 ? `
        <div class="section-header">
          <div class="section-title" style="color:var(--accent-red);">🔴 Needs Attention (${urgent.length})</div>
        </div>
        <div style="padding:0 20px;margin-bottom:20px;">
          ${urgent.map(renderDocRow).join('')}
        </div>
      ` : ''}

      <div class="section-header">
        <div class="section-title">✅ All Documents (${ok.length} Valid)</div>
      </div>
      <div style="padding:0 20px 20px;">
        ${ok.map(renderDocRow).join('')}
      </div>
    </div>
  `;

  document.getElementById('page-container').innerHTML = html;
}
