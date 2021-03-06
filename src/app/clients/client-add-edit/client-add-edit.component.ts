import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatDialog, MatSnackBar } from '@angular/material';

import { IndividualRegistrationValidator } from '../../../shared/validators/individualRegistration.validator';
import IZipCode from '../../../shared/interfaces/zipCode.interface';
import { HttpService } from '../../../shared/services/http/http.service';
import IClient from '../../../shared/interfaces/client.interface';
import { DatabaseService } from '../../../shared/services/database/database.service';
import { ClientEntity } from '../../../shared/services/database/entities/client.entity';
import { ConfirmationComponent } from '../../../shared/components/confirmation/confirmation.component';
import Localization from '../../../shared/entities/zip.entity';
import { pairwise } from 'rxjs/internal/operators/pairwise';

@Component({
  selector: 'app-client-add-edit',
  templateUrl: './client-add-edit.component.html',
  styleUrls: ['./client-add-edit.component.scss']
})
export class ClientAddEditComponent implements OnInit {
  public clientForm: FormGroup;
  private ZIP_SERVICE_URL = 'https://viacep.com.br/ws';
  private ZIP_RETURN_TYPE = 'json';

  constructor(
    private _fb: FormBuilder,
    private _httpService: HttpService,
    private _databaseService: DatabaseService,
    private route: ActivatedRoute,
    private _snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  async ngOnInit() {
    this.clientForm = this._fb.group({
      id: null,
      name: [null, [Validators.required]],
      individualRegistration: [
        null,
        [
          Validators.required,
          Validators.minLength(11),
          Validators.maxLength(11),
          IndividualRegistrationValidator.validate
        ]
      ],
      status: true,
      email: ['', [Validators.email]],
      cellphone: '',
      zip: ['', [Validators.minLength(8), Validators.maxLength(8)]],
      state: '',
      city: '',
      district: '',
      street: '',
      num: null,
      birthDate: null
    });

    this.route.paramMap.subscribe(async params => {
      this.id.patchValue(parseInt(params['params'].id, null));

      if (this.id.value) {
        await this.getClient(this.id.value);
      }
    });

    this.clientForm.controls.zip.valueChanges
      .pipe(pairwise())
      .subscribe(([prev, next]: [string, string]) => {
        if (next.length === 8 && prev !== next) {
          this.findClientZipCode(next);
        }
      });
  }

  get email() {
    return this.clientForm.get('email');
  }

  get id() {
    return this.clientForm.get('id');
  }

  get name() {
    return this.clientForm.get('name');
  }

  get individualRegistration() {
    return this.clientForm.get('individualRegistration');
  }

  get zip() {
    return this.clientForm.get('zip');
  }

  get status() {
    return this.clientForm.get('status');
  }

  public async findClientZipCode(zipcode: string) {
    try {
      // tslint:disable-next-line: max-line-length
      const zip = new Localization(
        (await this._httpService
          .get(this.ZIP_SERVICE_URL, this.ZIP_RETURN_TYPE, zipcode)
          .toPromise()) as IZipCode
      );
      this.clientForm.patchValue(zip);
    } catch (err) {
      console.error(err);
    }
  }

  async getClient(id: number) {
    try {
      await this._databaseService.connection.then(async () => {
        const client = await ClientEntity.findOne(id);
        this.clientForm.patchValue(client);
      });
    } catch (err) {
      console.error(err);
      this._snackBar.open('Não foi possível carregar o cliente.', 'OK', {
        duration: 2000
      });
    }
  }

  async deactivateClient() {
    try {
      const client = this.clientForm.value as IClient;

      const confirmation = {
        message: 'Deseja desativar o cliente',
        data: client.name,
        action: 'Desativar'
      };

      const dialogRef = this.dialog.open(ConfirmationComponent, {
        minWidth: '25%',
        minHeight: '25%',
        data: { ...confirmation }
      });

      dialogRef.afterClosed().subscribe(async data => {
        if (data) {
          await this._databaseService.connection.then(async () => {
            await ClientEntity.update({ id: client.id }, { status: false });
            this.clientForm.controls.status.setValue(false);
          });
        }
      });
    } catch (err) {
      console.error(err);
      this._snackBar.open('Não foi possível desativar o cliente.', 'OK', {
        duration: 2000
      });
    }
  }

  async activateClient() {
    try {
      const client = this.clientForm.value as IClient;

      const confirmation = {
        message: 'Deseja ativar o cliente',
        data: client.name,
        action: 'Ativar'
      };

      const dialogRef = this.dialog.open(ConfirmationComponent, {
        minWidth: '25%',
        minHeight: '25%',
        data: { ...confirmation }
      });

      dialogRef.afterClosed().subscribe(async data => {
        if (data) {
          await this._databaseService.connection
            .then(async () => {
              await ClientEntity.update({ id: client.id }, { status: true });
              this.clientForm.controls.status.setValue(true);
            })
            .catch(err => console.error(err));
        }
      });
    } catch (err) {
      console.error(err);
      this._snackBar.open('Não foi possível ativar o cliente.', 'OK', {
        duration: 2000
      });
    }
  }

  async onSubmit() {
    try {
      if (this.clientForm.valid) {
        const formValue = this.clientForm.value as IClient;

        const clientEntity = Object.assign(new ClientEntity(), formValue);

        if (!this.id.value) {
          delete clientEntity.id;
        }

        await this._databaseService.connection.then(async () => {
          const saveResult = await clientEntity.save();
          this.id.patchValue(saveResult.id);
          this._snackBar.open('Cliente salvo com sucesso.', 'OK', {
            duration: 2000
          });
        });
      }
    } catch (err) {
      console.error(err);
      this._snackBar.open('Não foi possível salvar o cliente.', 'OK', {
        duration: 2000
      });
    }
  }
}
