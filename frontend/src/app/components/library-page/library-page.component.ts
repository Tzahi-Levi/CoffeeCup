import { Component, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { CoffeeEntry } from '../../models/coffee.models';
import { CoffeeService } from '../../services/coffee.service';
import { SearchService } from '../../services/search.service';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { CoffeeCardGridComponent } from '../coffee-card-grid/coffee-card-grid.component';
import { FabButtonComponent } from '../fab-button/fab-button.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-library-page',
  standalone: true,
  imports: [AsyncPipe, SearchBarComponent, CoffeeCardGridComponent, FabButtonComponent, ConfirmDialogComponent],
  templateUrl: './library-page.component.html',
  styleUrl: './library-page.component.scss'
})
export class LibraryPageComponent implements OnInit {
  filteredCoffees$!: Observable<CoffeeEntry[]>;
  pendingDeleteId: string | null = null;

  constructor(
    private coffeeService: CoffeeService,
    private searchService: SearchService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.filteredCoffees$ = this.coffeeService.filteredCoffees$(this.searchService.query$);
  }

  onSearch(query: string): void {
    this.searchService.setQuery(query);
  }

  onEdit(id: string): void {
    this.router.navigate(['/edit', id]);
  }

  onDeleteRequest(id: string): void {
    this.pendingDeleteId = id;
  }

  onDeleteConfirmed(): void {
    if (this.pendingDeleteId) {
      this.coffeeService.deleteCoffee(this.pendingDeleteId);
    }
    this.pendingDeleteId = null;
  }

  onDeleteCancelled(): void {
    this.pendingDeleteId = null;
  }
}
