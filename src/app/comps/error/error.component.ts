import { HttpErrorResponse } from '@angular/common/http';
import { AfterContentInit, Component, Input, OnInit, TemplateRef, ViewChild, inject, input } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-error',
    imports: [],
    templateUrl: './error.component.html',
    styleUrl: './error.component.scss'
})
export class ErrorComponent  {
    @Input()
    httpErrorResponse!: HttpErrorResponse;
}
