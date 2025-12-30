import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationWorkflow } from './entities/automation-workflow.entity';
import { WorkflowExecution } from './entities/workflow-execution.entity';
import { DealService } from './deal.service';
import { TaskService } from './task.service';
import { EmailTrackingService } from './email-tracking.service';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(AutomationWorkflow)
    private workflowRepository: Repository<AutomationWorkflow>,
    @InjectRepository(WorkflowExecution)
    private executionRepository: Repository<WorkflowExecution>,
    private dealService: DealService,
    private taskService: TaskService,
    private emailTrackingService: EmailTrackingService,
  ) {}

  async getAllWorkflows() {
    return this.workflowRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async getWorkflowById(id: number) {
    const workflow = await this.workflowRepository.findOne({ where: { id } });
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  async createWorkflow(data: Partial<AutomationWorkflow>, createdBy?: number) {
    const workflow = this.workflowRepository.create({
      ...data,
      createdBy: createdBy,
    });
    return this.workflowRepository.save(workflow);
  }

  async updateWorkflow(id: number, data: Partial<AutomationWorkflow>) {
    await this.workflowRepository.update(id, data);
    return this.getWorkflowById(id);
  }

  async deleteWorkflow(id: number) {
    await this.workflowRepository.delete(id);
  }

  async toggleWorkflow(id: number, isActive: boolean) {
    await this.workflowRepository.update(id, { isActive });
    return this.getWorkflowById(id);
  }

  // Execute workflow
  async executeWorkflow(workflowId: number, triggerData: any) {
    const workflow = await this.getWorkflowById(workflowId);

    if (!workflow.isActive) {
      throw new Error('Workflow is not active');
    }

    // Check conditions
    const conditionsMet = await this.evaluateConditions(workflow.conditions, triggerData);

    if (!conditionsMet) {
      return {
        executed: false,
        reason: 'Conditions not met'
      };
    }

    const execution = {
      workflowId,
      triggerData,
      actionsExecuted: [] as any[],
      executionStatus: 'success' as 'success' | 'failed' | 'partial',
      errorMessage: undefined as string | undefined
    };

    try {
      // Execute actions
      for (const action of workflow.actions) {
        try {
          await this.executeAction(action, triggerData);
          execution.actionsExecuted.push({
            action: action.type,
            status: 'success',
            timestamp: new Date()
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          execution.actionsExecuted.push({
            action: action.type,
            status: 'failed',
            error: errorMessage,
            timestamp: new Date()
          });
          execution.executionStatus = 'partial';
        }
      }

      // Update workflow stats
      await this.workflowRepository.increment({ id: workflowId }, 'executionCount', 1);
      if (execution.executionStatus === 'success') {
        await this.workflowRepository.increment({ id: workflowId }, 'successCount', 1);
      } else {
        await this.workflowRepository.increment({ id: workflowId }, 'failureCount', 1);
      }
      await this.workflowRepository.update(workflowId, { lastExecutedAt: new Date() });

    } catch (error) {
      execution.executionStatus = 'failed';
      execution.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.workflowRepository.increment({ id: workflowId }, 'failureCount', 1);
    }

    // Log execution
    const executionRecord = this.executionRepository.create(execution);
    await this.executionRepository.save(executionRecord);

    return {
      executed: true,
      executionStatus: execution.executionStatus,
      actionsExecuted: execution.actionsExecuted
    };
  }

  private async evaluateConditions(conditions: any[], triggerData: any): Promise<boolean> {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    for (const condition of conditions) {
      const field = triggerData[condition.field];
      const value = condition.value;

      switch (condition.operator) {
        case 'equals':
          if (field !== value) return false;
          break;
        case 'not_equals':
          if (field === value) return false;
          break;
        case 'greater_than':
          if (!(field > value)) return false;
          break;
        case 'less_than':
          if (!(field < value)) return false;
          break;
        case 'contains':
          if (!String(field).includes(value)) return false;
          break;
        case 'not_contains':
          if (String(field).includes(value)) return false;
          break;
      }
    }

    return true;
  }

  private async executeAction(action: any, triggerData: any) {
    switch (action.type) {
      case 'send_email':
        await this.executeEmailAction(action, triggerData);
        break;
      case 'create_task':
        await this.executeCreateTaskAction(action, triggerData);
        break;
      case 'update_deal_stage':
        await this.executeUpdateDealStageAction(action, triggerData);
        break;
      case 'assign_to_user':
        await this.executeAssignAction(action, triggerData);
        break;
      case 'add_tag':
        await this.executeAddTagAction(action, triggerData);
        break;
      case 'wait':
        await this.executeWaitAction(action);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async executeEmailAction(action: any, triggerData: any) {
    // Send email using email tracking service
    await this.emailTrackingService.create({
      customerId: triggerData.customerId,
      subject: action.config.subject,
      body: action.config.body,
      toAddress: triggerData.customerEmail,
      sentAt: new Date()
    });
  }

  private async executeCreateTaskAction(action: any, triggerData: any) {
    await this.taskService.create({
      title: action.config.title,
      description: action.config.description,
      customerId: triggerData.customerId,
      dealId: triggerData.dealId,
      assignedTo: action.config.assigneeId,
      dueDate: new Date(Date.now() + (action.config.dueDays || 1) * 24 * 60 * 60 * 1000),
      priority: action.config.priority || 'medium',
      status: 'pending'
    });
  }

  private async executeUpdateDealStageAction(action: any, triggerData: any) {
    if (triggerData.dealId) {
      await this.dealService.update(triggerData.dealId, {
        stage: action.config.newStage
      });
    }
  }

  private async executeAssignAction(action: any, triggerData: any) {
    if (triggerData.dealId) {
      await this.dealService.update(triggerData.dealId, {
        ownerId: action.config.userId
      });
    }
  }

  private async executeAddTagAction(action: any, triggerData: any) {
    if (triggerData.dealId) {
      const deal = await this.dealService.findOne(triggerData.dealId);
      if (deal) {
        const tags = deal.tags || [];
        if (!tags.includes(action.config.tag)) {
          tags.push(action.config.tag);
          await this.dealService.update(triggerData.dealId, { tags });
        }
      }
    }
  }

  private async executeWaitAction(action: any) {
    const delayMs = (action.config.days || 0) * 24 * 60 * 60 * 1000 +
                    (action.config.hours || 0) * 60 * 60 * 1000 +
                    (action.config.minutes || 0) * 60 * 1000;
    
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  async getWorkflowExecutions(workflowId: number, limit: number = 50) {
    return this.executionRepository.find({
      where: { workflowId },
      order: { executedAt: 'DESC' },
      take: limit
    });
  }

  async getWorkflowStats(workflowId: number) {
    const workflow = await this.getWorkflowById(workflowId);
    const executions = await this.getWorkflowExecutions(workflowId, 100);

    const successRate = workflow.executionCount > 0 
      ? (workflow.successCount / workflow.executionCount) * 100 
      : 0;

    return {
      totalExecutions: workflow.executionCount,
      successCount: workflow.successCount,
      failureCount: workflow.failureCount,
      successRate,
      lastExecutedAt: workflow.lastExecutedAt,
      recentExecutions: executions.slice(0, 10)
    };
  }

  // Trigger workflows based on events
  async triggerWorkflowsByEvent(triggerType: string, triggerData: any) {
    const workflows = await this.workflowRepository.find({
      where: { triggerType: triggerType as any, isActive: true }
    });

    const results = [];
    for (const workflow of workflows) {
      try {
        const result = await this.executeWorkflow(workflow.id, triggerData);
        results.push({ workflowId: workflow.id, result });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ workflowId: workflow.id, error: errorMessage });
      }
    }

    return results;
  }
}
