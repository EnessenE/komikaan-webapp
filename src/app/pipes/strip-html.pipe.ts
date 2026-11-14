import { Pipe, PipeTransform } from '@angular/core';

/** Renders API-supplied text that may contain HTML tags as plain text. */
@Pipe({
    name: 'stripHtml',
    standalone: true,
})
export class StripHtmlPipe implements PipeTransform {
    transform(value: string | null | undefined): string {
        if (!value) return '';
        return value.replace(/<[^>]*>/g, '');
    }
}
