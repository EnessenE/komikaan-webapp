import { AfterContentInit, Component, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-error',
    standalone: true,
    imports: [],
    templateUrl: './error.component.html',
    styleUrl: './error.component.scss',
})
export class ErrorComponent implements AfterContentInit {

    ngAfterContentInit(): void {
    }

    open() {
    }

    close() {}
}
