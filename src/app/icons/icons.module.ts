import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BootstrapIconsModule } from 'ng-bootstrap-icons';
//TODO: Do not import all icons
import { allIcons } from 'ng-bootstrap-icons/icons';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    BootstrapIconsModule.pick(allIcons)
  ],
  exports: [
    BootstrapIconsModule
  ]
})
export class IconsModule { }
