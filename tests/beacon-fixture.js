import { expect } from '@playwright/test';

export async function sendBeacon(viewer){
  if(!await viewer.locator('#send-beacon').isVisible())await viewer.locator('#connection-settings').evaluate(el=>{el.open=true;});
  await viewer.locator('#send-beacon').click();
  await expect(viewer.locator('#beacon-status')).toHaveText(/Waiting for a browser|A browser wants to control playback/);
  return viewer;
}

export async function pairWithBeacon(controller,viewer){
  if(!await controller.locator('#scan-dialog').isVisible())await controller.locator('#scan-beacons').click();
  await expect(controller.locator('#scan-status')).toHaveText('Waiting for approval…',{timeout:20000});
  await expect(viewer.locator('#allow-pair')).toBeVisible();
  await viewer.getByRole('button',{name:'Allow to pair'}).click();
  await expect(controller.locator('#beacon-actions')).toBeHidden({timeout:45000});
  await expect(viewer.locator('#beacon-actions')).toBeHidden();
  await expect(controller.locator('#play')).toBeEnabled();
}
