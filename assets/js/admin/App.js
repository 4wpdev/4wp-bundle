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
            {tab.name === 'installed' && installed.map((block) => (
              <Card key={block.slug} style={{ minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '15px' }}>
                <div>
                  <h3>{block.name}</h3>
                  <p>Version: {block.version}</p>
                </div>
                <Button
                  variant={block.active ? 'secondary' : 'primary'}
                  onClick={() => toggleBlock(block.slug, block.active ? 'deactivate' : 'activate')}
                >
                  {block.active ? 'Deactivate' : 'Activate'}
                </Button>
              </Card>
            ))}

            {tab.name === 'available' && available.map((block) => {
              const installedBlock = installedMap[block.slug];
              return (
                <Card key={block.slug} style={{ minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '15px' }}>
                  <div>
                    <h3>{block.title || block.name}</h3>
                    <p>{block.description}</p>
                    <p>Version: {block.version}</p>
                    {installedBlock && installedBlock.active && (
                      <p style={{ color: '#22c55d', fontWeight: 600 }}>Activated</p>
                    )}
                  </div>
                  {installedBlock ? (
                    installedBlock.active ? (
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
                    )
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
