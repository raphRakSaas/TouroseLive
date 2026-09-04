import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-donate-page',
  imports: [RouterLink],
  templateUrl: './donate-page.html',
  styleUrl: './donate-page.scss',
})
export class DonatePage {
  protected readonly tiers = [
    {
      amount: '1 €',
      title: 'Un café',
      text: 'Pour que le développeur reste éveillé pendant que l’API parle à Wikipedia.',
    },
    {
      amount: '5 €',
      title: 'Chocolatine + café',
      text: 'Oui, chocolatine. On est à Toulouse, on assume. Le croissant peut attendre.',
    },
    {
      amount: '10 €',
      title: 'Une brique rose',
      text: 'Financer une micro-feature. Ou une vraie brique. Ou les deux, on verra.',
    },
  ];
}
