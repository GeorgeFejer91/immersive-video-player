import { expect } from '@playwright/test';

export async function sendBeacon(viewer){
  await viewer.locator('#connection-settings').evaluate(el=>{el.open=true;});
  await viewer.locator('#send-beacon').click();
  await expect(viewer.locator('#beacon-status')).toHaveText(/Beacon active|Waiting/);
  return {name:await viewer.locator('#beacon-name').innerText(),code:await viewer.locator('#beacon-code').innerText()};
}

export async function pairWithBeacon(controller,{name,code}){
  if(!await controller.locator('#scan-dialog').isVisible())await controller.locator('#scan-beacons').click();
  await expect(controller.locator('#beacons option').filter({hasText:name})).toHaveCount(1,{timeout:20000});
  await controller.locator('#beacons').selectOption({label:name});
  await controller.locator('#pairing-code').fill(code);
  await controller.getByRole('button',{name:'Pair with viewer'}).click();
  await expect(controller.locator('#scan-beacons')).toBeHidden({timeout:45000});
  await expect(controller.locator('#play')).toBeEnabled();
}
