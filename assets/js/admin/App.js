import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { Spinner, Card, Button, TabPanel, Notice } from '@wordpress/components';

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '20px',
  alignItems: 'stretch',
};

const App = () => {
  const [installed, setInstalled] = useState([]);
  const [available, setAvailable] = useState(null);
  const [installing, setInstalling] = useState({});
  const [updating, setUpdating] = useState({});
  const [notice, setNotice] = useState(null);

  const loadBlocks = () => {
    apiFetch({ path: '4wp/v1/blocks' }).then((data) => {
      setInstalled(data.installed || []);
      setAvailable(data.available || []);
    });
  };

  useEffect(() => {
    loadBlocks();
  }, []);

  const toggleBlock = (slug, action) => {
    // Додаємо логування для дебагу
    console.log('toggleBlock:', { slug, action });
    apiFetch({
      path: '4wp/v1/block-toggle',
      method: 'POST',
      data: { slug, action }
    }).then(() => {
      loadBlocks(); // просто оновлюємо список, без редіректу
    });
  };

  const installBlock = (block) => {
    if (!block.download_url) {
      setNotice({ status: 'error', message: 'No download URL for this plugin.' });
      return;
    }
    setInstalling((prev) => ({ ...prev, [block.slug]: true }));
    setNotice(null);
    apiFetch({
      path: '4wp/v1/plugin-install',
      method: 'POST',
      data: { download_url: block.download_url }
    })
      .then((res) => {
        if (res && res.success) {
          setNotice({ status: 'success', message: 'Plugin installed successfully.' });
          loadBlocks(); // Оновлюємо списки з бекенду, щоб уникнути проблеми з некоректним slug
        } else {
          setNotice({ status: 'error', message: res && res.message ? res.message : 'Install failed.' });
        }
      })
      .catch((err) => {
        setNotice({ status: 'error', message: err.message || 'Install failed.' });
      })
      .finally(() => {
        setInstalling((prev) => ({ ...prev, [block.slug]: false }));
      });
  };

  const updateBlock = (block) => {
    if (!block.download_url) {
      setNotice({ status: 'error', message: 'No download URL for this plugin.' });
      return;
    }
    setUpdating((prev) => ({ ...prev, [block.slug]: true }));
    setNotice(null);
    apiFetch({
      path: '4wp/v1/plugin-update',
      method: 'POST',
      data: { slug: block.slug, download_url: block.download_url }
    })
      .then((res) => {
        if (res && res.installed) {
          setNotice({ status: 'success', message: `Plugin updated successfully to version ${block.version || 'latest'}.` });
          loadBlocks();
        } else {
          setNotice({ status: 'error', message: res && res.message ? res.message : 'Update failed.' });
        }
      })
      .catch((err) => {
        setNotice({ status: 'error', message: err.message || 'Update failed.' });
      })
      .finally(() => {
        setUpdating((prev) => ({ ...prev, [block.slug]: false }));
      });
  };

  if (!installed || available === null) return <Spinner />;

  // Створюємо map для швидкого пошуку встановлених плагінів за slug
  const installedMap = installed.reduce((acc, block) => {
    acc[block.slug] = block;
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', paddingTop: '48px' }}>
      <h1>4WP Bundle</h1>
      {notice && <Notice status={notice.status} isDismissible onRemove={() => setNotice(null)}>{notice.message}</Notice>}
      <TabPanel
        tabs={[
          { name: 'installed', title: 'Installed', className: 'tab-installed' },
          { name: 'available', title: 'Available', className: 'tab-available' },
        ]}
      >
        {(tab) => (
          <div style={gridStyle}>
            {tab.name === 'installed' && installed.map((block) => {
              // Check if update is available for this installed plugin
              const availableBlock = available.find(b => b.slug === block.slug);
              const hasUpdate = availableBlock && availableBlock.has_update;
              const hasDowngrade = block.has_downgrade || (availableBlock && availableBlock.has_downgrade);
              
              return (
                <Card key={block.slug} style={{ minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '15px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0 }}>{block.name}</h3>
                      {availableBlock?.readme_url && (
                        <a
                          href={availableBlock.readme_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#2271b1' }}
                          title="View README"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </a>
                      )}
                    </div>
                    <p>Version: {block.version}</p>
                    {hasUpdate && (
                      <p style={{ color: '#f59e0b', fontWeight: 600, marginTop: '8px' }}>
                        Update available: {availableBlock.update_version}
                      </p>
                    )}
                    {hasDowngrade && (
                      <p style={{ color: '#ef4444', fontWeight: 600, marginTop: '8px' }}>
                        ⚠ Local version ({block.version}) is newer than repository ({block.downgrade_version || availableBlock?.downgrade_version || availableBlock?.version})
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexDirection: 'row', flexWrap: 'wrap' }}>
                    {hasUpdate && (
                      <Button
                        variant="primary"
                        isBusy={!!updating[block.slug]}
                        disabled={!!updating[block.slug]}
                        onClick={() => updateBlock(availableBlock)}
                      >
                        {updating[block.slug] ? 'Updating...' : `Update to ${availableBlock.update_version}`}
                      </Button>
                    )}
                    {hasDowngrade && (
                      <Button
                        variant="secondary"
                        isBusy={!!updating[block.slug]}
                        disabled={!!updating[block.slug]}
                        onClick={() => updateBlock(availableBlock)}
                        style={{ borderColor: '#ef4444', color: '#ef4444' }}
                      >
                        {updating[block.slug] ? 'Rolling back...' : `Rollback to ${block.downgrade_version || availableBlock?.downgrade_version || availableBlock?.version}`}
                      </Button>
                    )}
                    <Button
                      variant={block.active ? 'secondary' : 'primary'}
                      onClick={() => toggleBlock(block.slug, block.active ? 'deactivate' : 'activate')}
                    >
                      {block.active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </Card>
              );
            })}

            {tab.name === 'available' && available.map((block) => {
              const installedBlock = installedMap[block.slug];
              const hasUpdate = block.has_update;
              const hasDowngrade = block.has_downgrade;
              
              return (
                <Card key={block.slug} style={{ minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '15px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0 }}>{block.title || block.name}</h3>
                      {block.readme_url && (
                        <a
                          href={block.readme_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#2271b1' }}
                          title="View README"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </a>
                      )}
                    </div>
                    <p>{block.description}</p>
                    <p>Version: {block.version}</p>
                    {installedBlock && (
                      <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        Installed: {installedBlock.version}
                      </p>
                    )}
                    {hasUpdate && (
                      <p style={{ color: '#f59e0b', fontWeight: 600, marginTop: '8px' }}>
                        ⚠ Update available!
                      </p>
                    )}
                    {hasDowngrade && (
                      <p style={{ color: '#ef4444', fontWeight: 600, marginTop: '8px' }}>
                        ⚠ Local version ({installedBlock?.version}) is newer than repository ({block.version})
                      </p>
                    )}
                    {installedBlock && installedBlock.active && (
                      <p style={{ color: '#22c55d', fontWeight: 600 }}>Activated</p>
                    )}
                  </div>
                  {installedBlock ? (
                    <div style={{ display: 'flex', gap: '8px', flexDirection: 'row', flexWrap: 'wrap' }}>
                      {hasUpdate && (
                        <Button
                          variant="primary"
                          isBusy={!!updating[block.slug]}
                          disabled={!!updating[block.slug]}
                          onClick={() => updateBlock(block)}
                        >
                          {updating[block.slug] ? 'Updating...' : `Update to ${block.update_version}`}
                        </Button>
                      )}
                      {hasDowngrade && (
                        <Button
                          variant="secondary"
                          isBusy={!!updating[block.slug]}
                          disabled={!!updating[block.slug]}
                          onClick={() => updateBlock(block)}
                          style={{ borderColor: '#ef4444', color: '#ef4444' }}
                        >
                          {updating[block.slug] ? 'Rolling back...' : `Rollback to ${block.downgrade_version || block.version}`}
                        </Button>
                      )}
                      {installedBlock.active ? (
                        <Button
                          variant="secondary"
                          onClick={() => toggleBlock(block.slug, 'deactivate')}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          onClick={() => toggleBlock(block.slug, 'activate')}
                        >
                          Activate
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      isBusy={!!installing[block.slug]}
                      disabled={!!installing[block.slug]}
                      onClick={() => installBlock(block)}
                    >
                      {installing[block.slug] ? 'Installing...' : 'Install'}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </TabPanel>
    </div>
  );
};

export default App;
