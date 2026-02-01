import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

interface Topic {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface TimelineEvent {
  topicId: string;
  topicName: string;
  timestamp: number;
  isoDatestamp: string;
}

const DEFAULT_COLORS = [
  '#27AE60', // Green for Pass
  '#E74C3C', // Red for Fail
  '#3498DB', // Blue
  '#F39C12', // Orange
  '#9B59B6', // Purple
  '#1ABC9C', // Turquoise
  '#34495E', // Dark Gray
  '#E67E22', // Dark Orange
  '#16A085', // Teal
  '#8E44AD', // Violet
  '#2980B9', // Dark Blue
  '#C0392B', // Dark Red
];

const MAX_EVENTS = 2000;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  @ViewChild('topicNameInput') topicNameInput!: ElementRef;

  title = 'Clicker';
  topics: Topic[] = [];
  timeline: TimelineEvent[] = [];
  newTopicName = '';
  capacityReachedAlert = false;
  colorIndex = 0;
  showAddTopicModal = false;

  pieChartData: ChartConfiguration<'pie'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [],
      }
    ]
  };

  pieChartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        reverse: true
      }
    }
  };

  lineChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  lineChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    indexAxis: 'x',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: function(context: any) {
            const index = context[0].dataIndex;
            return 'Event #' + (index + 1);
          },
          label: function(context: any): string {
            return context.dataset.label;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        display: false,
        beginAtZero: true,
      },
      y: {
        stacked: true,
        display: false
      }
    }
  };

  constructor() {}

  ngOnInit(): void {
    this.loadFromStorage();
    if (this.topics.length === 0) {
      this.initializeDefaultTopics();
    } else {
      // Ensure Pass and Fail have correct colors
      const passTopics = this.topics.filter(t => t.name === 'Pass');
      const failTopics = this.topics.filter(t => t.name === 'Fail');
      
      if (passTopics.length > 0) {
        passTopics[0].color = DEFAULT_COLORS[0]; // Green
      }
      if (failTopics.length > 0) {
        failTopics[0].color = DEFAULT_COLORS[1]; // Red
      }
    }
    this.updateCharts();
  }

  private initializeDefaultTopics(): void {
    this.addTopicWithColor('Pass', DEFAULT_COLORS[0]); // Green
    this.addTopicWithColor('Fail', DEFAULT_COLORS[1]); // Red
  }

  private addTopicWithColor(name: string, color: string): void {
    const topic: Topic = {
      id: Date.now().toString() + Math.random(),
      name,
      color,
      count: 0
    };
    this.topics.push(topic);
  }

  private addTopicWithoutStorage(name: string): void {
    const topic: Topic = {
      id: Date.now().toString() + Math.random(),
      name,
      color: DEFAULT_COLORS[(this.colorIndex + 2) % DEFAULT_COLORS.length],
      count: 0
    };
    this.colorIndex++;
    this.topics.push(topic);
  }

  addTopic(): void {
    if (this.newTopicName.trim()) {
      this.addTopicWithoutStorage(this.newTopicName.trim());
      this.newTopicName = '';
      this.saveToStorage();
      this.updateCharts();
      this.closeAddTopicModal();
    }
  }

  openAddTopicModal(): void {
    this.showAddTopicModal = true;
    this.newTopicName = '';
    // Focus the input after the modal is rendered
    setTimeout(() => {
      this.topicNameInput?.nativeElement?.focus();
    }, 100);
  }

  closeAddTopicModal(): void {
    this.showAddTopicModal = false;
    this.newTopicName = '';
  }

  incrementTopic(topicId: string): void {
    if (this.timeline.length >= MAX_EVENTS) {
      this.capacityReachedAlert = true;
      setTimeout(() => {
        this.capacityReachedAlert = false;
      }, 5000);
      return;
    }

    const topic = this.topics.find(t => t.id === topicId);
    if (topic) {
      topic.count++;
      const event: TimelineEvent = {
        topicId,
        topicName: topic.name,
        timestamp: Date.now(),
        isoDatestamp: new Date().toISOString()
      };
      this.timeline.push(event);
      this.saveToStorage();
      this.updateCharts();
    }
  }

  clearData(): void {
    if (confirm('Are you sure you want to clear all counts and timeline events?')) {
      this.topics.forEach(topic => {
        topic.count = 0;
      });
      this.timeline = [];
      this.saveToStorage();
      this.updateCharts();
    }
  }

  resetTopics(): void {
    if (confirm('Are you sure you want to reset all topics to Pass & Fail? This will also clear all data.')) {
      this.topics = [];
      this.timeline = [];
      this.colorIndex = 0;
      this.initializeDefaultTopics();
      this.saveToStorage();
      this.updateCharts();
    }
  }

  exportData(): void {
    const totalsCSV = this.generateTotalsCSV();
    const eventsCSV = this.generateEventsCSV();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.downloadCSV(totalsCSV, `event-counter-totals-${timestamp}.csv`);
    this.downloadCSV(eventsCSV, `event-counter-events-${timestamp}.csv`);
  }

  private generateTotalsCSV(): string {
    let csv = 'Topic,Count\n';
    this.topics.forEach(topic => {
      csv += `"${topic.name}",${topic.count}\n`;
    });
    return csv;
  }

  private generateEventsCSV(): string {
    let csv = 'Topic,Timestamp (Epoch),Timestamp (ISO)\n';
    this.timeline.forEach(event => {
      csv += `"${event.topicName}",${event.timestamp},"${event.isoDatestamp}"\n`;
    });
    return csv;
  }

  private downloadCSV(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private updateCharts(): void {
    this.updatePieChart();
    this.updateLineChart();
  }

  private updatePieChart(): void {
    const reversedTopics = [...this.topics].reverse();
    this.pieChartData.labels = reversedTopics.map(t => t.name);
    this.pieChartData.datasets[0].data = reversedTopics.map(t => t.count);
    this.pieChartData.datasets[0].backgroundColor = reversedTopics.map(t => t.color);
    this.pieChartData = { ...this.pieChartData };
  }

  private updateLineChart(): void {
    // Create segments for each event in the timeline
    const backgroundColors: string[] = [];
    const borderColors: string[] = [];
    const data: number[] = [];
    const labels: string[] = [];

    this.timeline.forEach((event, index) => {
      const topic = this.topics.find(t => t.id === event.topicId);
      labels.push(topic?.name.substring(0, 1) || 'E');
      backgroundColors.push(topic?.color || '#999999');
      borderColors.push(topic?.color || '#999999');
      data.push(1); // Each segment is 1 unit
    });

    this.lineChartData.labels = labels;
    this.lineChartData.datasets = [
      {
        label: 'Event Timeline',
        data: data,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
        barPercentage: 1,
        categoryPercentage: 1
      }
    ];

    this.lineChartData = { ...this.lineChartData };
  }

  private saveToStorage(): void {
    const data = {
      topics: this.topics,
      timeline: this.timeline
    };
    localStorage.setItem('eventCounterData', JSON.stringify(data));
  }

  private loadFromStorage(): void {
    const data = localStorage.getItem('eventCounterData');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        this.topics = parsed.topics || [];
        this.timeline = parsed.timeline || [];
      } catch (e) {
        console.error('Failed to load from storage', e);
      }
    }
  }

  dismissAlert(): void {
    this.capacityReachedAlert = false;
  }

  getContrastColor(hexColor: string): string {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155 ? '#000000' : '#FFFFFF';
  }
}
