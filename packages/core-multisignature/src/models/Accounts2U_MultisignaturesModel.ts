import { Symbols } from '@risevision/core-interfaces';
import { BaseModel, ModelSymbols } from '@risevision/core-models';
import { Column, ForeignKey, PrimaryKey, Table } from 'sequelize-typescript';

@Table({ tableName: 'mem_accounts2u_multisignatures' })
// tslint:disable-next-line class-name
export class Accounts2U_MultisignaturesModel extends BaseModel<
  Accounts2U_MultisignaturesModel
> {
  @PrimaryKey
  @Column
  public dependentId: string;
  @PrimaryKey
  @ForeignKey(() =>
    Accounts2U_MultisignaturesModel.container.getNamed(
      ModelSymbols.model,
      Symbols.models.accounts
    )
  )
  @Column
  public accountId: string;
}