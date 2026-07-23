import { MetaCapiService } from './meta-capi.service';

const PIXEL_GROUPS = JSON.stringify([
  { pixelId: '1882443545705830', accessToken: 'main-token' },
  { pixelId: '1433976858485362', accessToken: 'herbolin-token' },
  { pixelId: '2270570453772206', accessToken: 'arabian-token' },
  { pixelId: '33963706619940423', accessToken: 'veshoj-token' },
]);

function createService() {
  const config = {
    get(key: string) {
      if (key === 'META_CAPI_PIXEL_GROUPS') return PIXEL_GROUPS;
      if (key === 'SYSTEM_USER_ID') return '1';
      return '';
    },
  };

  return new MetaCapiService(
    config as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
}

describe('MetaCapiService pixel routing', () => {
  it('selects exactly one configured pixel for a main website order', () => {
    const service = createService() as any;
    const configs = service.getPixelConfigs({
      orderSource: 'website',
      createdBy: 1,
      metaEventSourceUrl: 'https://trustcart.com.bd/checkout',
    });

    expect(configs.map((config: any) => config.pixelId)).toEqual(['1882443545705830']);
  });

  it('selects exactly the Arabian pixel for an Arabian landing-page order', () => {
    const service = createService() as any;
    const configs = service.getPixelConfigs({
      orderSource: 'landing_page',
      createdBy: 1,
      utmSource: 'arabiankhalta',
      metaEventSourceUrl: 'https://arabiankhalta.com/',
    });

    expect(configs.map((config: any) => config.pixelId)).toEqual(['2270570453772206']);
  });

  it('selects no production pixel for manual or localhost orders', () => {
    const service = createService() as any;

    expect(service.getPixelConfigs({
      orderSource: 'admin_panel',
      createdBy: 51,
      metaEventSourceUrl: 'https://trustcart.com.bd/admin/sales',
    })).toEqual([]);
    expect(service.getPixelConfigs({
      orderSource: 'website',
      createdBy: 1,
      metaEventSourceUrl: 'http://localhost:3000/checkout',
    })).toEqual([]);
  });
});
