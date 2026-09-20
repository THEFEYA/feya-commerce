export default function CompanyLoading() {
  return (
    <main className="owner-page" aria-busy="true" aria-label="Загрузка данных FEYA">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div style={{ width: 'min(620px, 100%)' }}>
            <div className="owner-skeleton" style={{ width: '120px', height: '12px', marginBottom: '12px' }} />
            <div className="owner-skeleton" style={{ width: '280px', height: '42px', marginBottom: '12px' }} />
            <div className="owner-skeleton" style={{ width: '100%', height: '16px' }} />
          </div>
        </header>

        <section className="owner-section" style={{ marginTop: 0 }}>
          <div className="owner-skeleton" style={{ width: '190px', height: '20px', marginBottom: '12px' }} />
          <div className="owner-grid two">
            <div className="owner-card"><div className="owner-skeleton" style={{ height: '112px' }} /></div>
            <div className="owner-card"><div className="owner-skeleton" style={{ height: '112px' }} /></div>
          </div>
        </section>

        <section className="owner-section">
          <div className="owner-skeleton" style={{ width: '230px', height: '20px', marginBottom: '12px' }} />
          <div className="owner-list">
            {[0, 1, 2].map((item) => (
              <div className="owner-list-row" key={item}>
                <div className="owner-list-row-main">
                  <div className="owner-skeleton" style={{ width: '38%', height: '14px', marginBottom: '8px' }} />
                  <div className="owner-skeleton" style={{ width: '78%', height: '12px' }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
