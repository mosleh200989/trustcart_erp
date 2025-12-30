import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrmBranches } from '../entities/hrm-branches.entity';
import { CreateBranchDto } from '../dto/create-branch.dto';
import { UpdateBranchDto } from '../dto/update-branch.dto';

@Injectable()
export class HrmBranchesService {
  constructor(
    @InjectRepository(HrmBranches)
    private readonly branchRepository: Repository<HrmBranches>,
  ) {}

  create(dto: CreateBranchDto) {
    const branch = this.branchRepository.create(dto);
    return this.branchRepository.save(branch);
  }

  findAll() {
    return this.branchRepository.find();
  }

  findOne(id: number) {
    return this.branchRepository.findOne({ where: { id } });
  }

  update(id: number, dto: UpdateBranchDto) {
    return this.branchRepository.update(id, dto);
  }

  remove(id: number) {
    return this.branchRepository.delete(id);
  }
}
