import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppUpdateBanner, AppUpdateRequired } from './AppUpdateNotice';
import { AppUpdateAbout } from '../settings/AppUpdateAbout';
const fake = vi.hoisted(() => ({ share:vi.fn(), offline:false, state: { online:true, banner:true, unsupported:false, checking:false, status:'update-available', lastCheckedAt:1, latest: { versionCode:7, versionName:'2.3.0', apkUrl:'https://github.com/galaxymaxp/stay-focused-releases/releases/download/v2.3.0+7/app.apk', notes:'Release notes as plain text.' } }, dismiss:vi.fn(), download:vi.fn(), check:vi.fn() }));
vi.mock('react-native', () => ({ View:'View', Share:{ share:fake.share } }));
vi.mock('../../auth', () => ({ useAuth: () => ({ session:{ offline:fake.offline } }) }));
vi.mock('../../design/primitives', () => ({ Action:'Action', Copy:'Copy', Sheet:'Sheet', Surface:'Surface' }));
vi.mock('../../services/useAppUpdate', () => ({ useAppUpdate: () => fake.state, installedApp:{version:'2.2.0',versionCode:6,update:'built-in'}, appUpdateStore:{dismiss:fake.dismiss,check:fake.check}, downloadAppUpdate:fake.download }));
let tree:ReactTestRenderer|undefined;
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
beforeEach(() => { vi.clearAllMocks();fake.offline=false;fake.state.banner=true;fake.state.unsupported=false;fake.state.status='update-available'; });
afterEach(async () => { if(tree) await act(async () => tree!.unmount());tree=undefined; });
async function mount(component: typeof AppUpdateBanner) { await act(async () => { tree=create(createElement(component)); });return tree!.root; }
it('shows one line with download and a dismissal bound to this release', async () => {
  const root=await mount(AppUpdateBanner);
  expect(root.findByType('Copy' as never).props.numberOfLines).toBe(1);
  const actions=root.findAllByType('Action' as never);
  await act(async () => actions[0]!.props.onPress());expect(fake.download).toHaveBeenCalledWith(fake.state.latest.apkUrl);
  await act(async () => actions[1]!.props.onPress());expect(fake.dismiss).toHaveBeenCalledWith(7);
});
it('hides optional notices offline or after dismissal', async () => {
  fake.offline=true;await mount(AppUpdateBanner);expect(tree!.toJSON()).toBeNull();
  fake.offline=false;fake.state.banner=false;await act(async () => tree!.update(createElement(AppUpdateBanner)));expect(tree!.toJSON()).toBeNull();
});
it('makes the required sheet non-dismissable and releases it offline', async () => {
  fake.state.unsupported=true;const root=await mount(AppUpdateRequired);
  expect(root.findByType('Sheet' as never).props.dismissible).toBe(false);
  await act(async () => root.findByType('Action' as never).props.onPress());expect(fake.download).toHaveBeenCalledWith(fake.state.latest.apkUrl);
  fake.offline=true;await act(async () => tree!.update(createElement(AppUpdateRequired)));expect(tree!.toJSON()).toBeNull();
});
it('shows build/OTA details, plain notes and a manual check with up-to-date feedback', async () => {
  fake.check.mockResolvedValue('checked');const root=await mount(AppUpdateAbout);
  expect(JSON.stringify(tree!.toJSON())).toContain('built-in');expect(JSON.stringify(tree!.toJSON())).toContain(fake.state.latest.notes);
  fake.state.status='up-to-date';
  await act(async () => root.findAllByType('Action' as never)[0]!.props.onPress());
  expect(fake.check).toHaveBeenCalledWith({manual:true,offline:false});
  expect(JSON.stringify(tree!.toJSON())).toContain('You’re up to date.');
  expect(JSON.stringify(tree!.toJSON())).not.toContain(fake.state.latest.notes);
});

it('shares the public website download URL from Settings About', async () => {
  vi.stubEnv('EXPO_PUBLIC_WEBSITE_URL', 'https://website.test');
  fake.share.mockResolvedValue({ action:'sharedAction' });
  try {
    const root = await mount(AppUpdateAbout);
    const share = root.findAllByType('Action' as never).find(node => node.props.children === 'Share download link');
    await act(async () => { share!.props.onPress(); });
    expect(fake.share).toHaveBeenCalledWith({ title:'Download Stay Focused', message:'https://website.test/download' });
  } finally { vi.unstubAllEnvs(); }
});
it('handles native sharing failure with calm feedback', async () => {
  fake.share.mockRejectedValue(new Error('private native details'));
  const root = await mount(AppUpdateAbout);
  await act(async () => { root.findAllByType('Action' as never).find(node => node.props.children === 'Share download link')!.props.onPress(); });
  expect(JSON.stringify(tree!.toJSON())).toContain('Could not open sharing. Please try again.');
  expect(JSON.stringify(tree!.toJSON())).not.toContain('private native details');
});
