import { Component, ViewChild, HostListener } from '@angular/core';
import { ColDef, ValueGetterParams } from 'ag-grid-community';
import { Race } from './common/race';
import { ChampionChipIreland } from './providers/championchip-ireland/championchip-ireland.provider';
import { IProvider } from './providers/provider';
import { AgGridAngular } from 'ag-grid-angular';
import { IconDefinition, faPersonRunning, faDownload } from '@fortawesome/free-solid-svg-icons';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  @ViewChild(AgGridAngular) grid!: AgGridAngular;

  public runner: IconDefinition = faPersonRunning;
  public download: IconDefinition = faDownload;

  public defaultGridColumnDef: ColDef = { sortable: true };
  public gridColumnDefinitions: ColDef[] = [];
  public gridColumnDefinitionsMobile: ColDef[] = [];
  public gridData: any[] = [];

  public providers: IProvider[];
  private activeProvider!: IProvider;

  public races: Race[] = [];
  private activeRace!: Race;

  public quickFilter: string = '';

  public isMobile: boolean = false;
  public hasMobileColumns: boolean = false;
  public showAllColumns: boolean = false;

  constructor(private championChipIreland: ChampionChipIreland) {
    this.providers = [championChipIreland];
    this.onProviderChange(this.providers[0].name);
  }

  async onProviderChange(name: string): Promise<void> {
    this.activeProvider = this.providers.find((x) => x.name === name)!;
    this.races = await this.activeProvider.getRaces();
    this.onRaceChange(this.races[0].name);
  }

  onRaceChange(name: string) {
    this.activeRace = this.races.find((x) => x.name === name)!;

    this.gridData = this.activeRace.results;
    this.gridColumnDefinitions = this.activeRace.headers.map((key) => {
      const hasData = this.gridData.some((x) => x[key]);
      const isNumeric = hasData && this.gridData.every((x) => !Number.isNaN(Number(x[key])));

      return {
        field: key,
        hide: !hasData,
        cellDataType: isNumeric ? 'number' : undefined,
        valueGetter: isNumeric ? this.numberParser(key) : undefined,
      };
    });

    this.gridColumnDefinitionsMobile = this.gridColumnDefinitions.map((columnDefinition) => ({
      ...columnDefinition,
      hide: columnDefinition.hide || !this.activeRace.headersMobile.includes(columnDefinition.field!),
    }));

    this.hasMobileColumns = this.activeRace.headersMobile.length != this.activeRace.headers.length;
  }

  numberParser(key: string) {
    return (params: ValueGetterParams) => Number(params.data[key]);
  }

  resizeGrid() {
    this.grid.columnApi.autoSizeAllColumns();

    const gridApi: any = this.grid.api;
    const availableWidth = gridApi.gridBodyCtrl.eBodyViewport.clientWidth;
    const usedWidth = gridApi.gridBodyCtrl.columnModel.displayedColumns.reduce((totalWidth: any, column: any) => totalWidth + column.actualWidth, 0);

    if (availableWidth > usedWidth) {
      this.grid.api.sizeColumnsToFit();
    }
  }

  exportData() {
    this.grid.api.exportDataAsCsv({
      exportedRows: 'filteredAndSorted',
      fileName: `${this.activeRace.name}.csv`,
      allColumns: true,
    });
  }

  onShowAllColumnsChange(event: MatSlideToggleChange) {
    this.showAllColumns = event.checked;

    setTimeout(() => this.resizeGrid());
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.isMobile = window.innerWidth < 1024;

    setTimeout(() => this.resizeGrid());
  }
}
